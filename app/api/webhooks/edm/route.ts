import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EdmTrackingEventType, EdmVariant } from "@/lib/types";

type NormalizedEdmEvent = {
  campaignId: string | null;
  automationLogId: string | null;
  automationRuleId: string | null;
  recipientEmail: string;
  eventType: EdmTrackingEventType;
  url: string | null;
  variant: EdmVariant | null;
};

type RawRecord = Record<string, unknown>;

const metricByEventType: Partial<Record<EdmTrackingEventType, string>> = {
  delivered: "delivered_count",
  open: "open_count",
  click: "click_count",
  bounce: "bounce_count"
};

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : null;
}

function isAuthorized(request: NextRequest) {
  const webhookSecret = process.env.EDM_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return {
      ok: false,
      status: 500,
      message: "EDM_WEBHOOK_SECRET is not configured."
    };
  }

  const token =
    getBearerToken(request) ??
    request.headers.get("x-edm-webhook-token") ??
    request.headers.get("x-webhook-token");

  if (token !== webhookSecret) {
    return {
      ok: false,
      status: 401,
      message: "Unauthorized EDM webhook request."
    };
  }

  return {
    ok: true,
    status: 200,
    message: "Authorized."
  };
}

function asRecord(value: unknown): RawRecord | null {
  return typeof value === "object" && value !== null ? (value as RawRecord) : null;
}

function getNestedRecord(record: RawRecord, key: string) {
  return asRecord(record[key]);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readFirstString(value: unknown) {
  if (Array.isArray(value)) {
    return readString(value[0]);
  }

  return readString(value);
}

function isUuid(value: string | null) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      )
  );
}

function normalizeEventType(rawEvent: string | null): EdmTrackingEventType | null {
  const event = rawEvent?.toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");

  if (!event) {
    return null;
  }

  if (event === "delivered" || event === "delivery") {
    return "delivered";
  }

  if (event === "open" || event === "opened") {
    return "open";
  }

  if (event === "click" || event === "clicked") {
    return "click";
  }

  if (event === "bounce" || event === "bounced" || event === "permanent_bounce") {
    return "bounce";
  }

  if (event === "spam_report" || event === "spamreport" || event === "complaint") {
    return "spam_report";
  }

  return null;
}

function normalizeVariant(rawVariant: string | null): EdmVariant | null {
  const variant = rawVariant?.trim().toLowerCase();

  if (variant === "a" || variant === "b" || variant === "winner") {
    return variant;
  }

  return null;
}

function extractCampaignIdFromUrl(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).searchParams.get("utm_campaign");
  } catch {
    return null;
  }
}

function extractVariantFromUrl(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.searchParams.get("variant") ??
      parsedUrl.searchParams.get("utm_content")
    );
  } catch {
    return null;
  }
}

function extractCampaignId(record: RawRecord) {
  const customArgs = getNestedRecord(record, "custom_args");
  const uniqueArgs = getNestedRecord(record, "unique_args");
  const mail = getNestedRecord(record, "mail");
  const tags = mail ? getNestedRecord(mail, "tags") : null;
  const clickUrl = readString(record.url);

  return (
    readString(record.campaign_id) ??
    readString(record.campaignId) ??
    readString(customArgs?.campaign_id) ??
    readString(uniqueArgs?.campaign_id) ??
    readFirstString(tags?.campaign_id) ??
    extractCampaignIdFromUrl(clickUrl)
  );
}

function extractAutomationLogId(record: RawRecord) {
  const customArgs = getNestedRecord(record, "custom_args");
  const uniqueArgs = getNestedRecord(record, "unique_args");
  const mail = getNestedRecord(record, "mail");
  const tags = mail ? getNestedRecord(mail, "tags") : null;

  return (
    readString(record.automation_log_id) ??
    readString(record.automationLogId) ??
    readString(customArgs?.automation_log_id) ??
    readString(uniqueArgs?.automation_log_id) ??
    readFirstString(tags?.automation_log_id)
  );
}

function extractAutomationRuleId(record: RawRecord) {
  const customArgs = getNestedRecord(record, "custom_args");
  const uniqueArgs = getNestedRecord(record, "unique_args");
  const mail = getNestedRecord(record, "mail");
  const tags = mail ? getNestedRecord(mail, "tags") : null;

  return (
    readString(record.automation_rule_id) ??
    readString(record.automationRuleId) ??
    readString(customArgs?.automation_rule_id) ??
    readString(uniqueArgs?.automation_rule_id) ??
    readFirstString(tags?.automation_rule_id)
  );
}

function extractVariant(record: RawRecord) {
  const customArgs = getNestedRecord(record, "custom_args");
  const uniqueArgs = getNestedRecord(record, "unique_args");
  const mail = getNestedRecord(record, "mail");
  const tags = mail ? getNestedRecord(mail, "tags") : null;
  const clickUrl = readString(record.url);

  return normalizeVariant(
    readString(record.variant) ??
      readString(customArgs?.variant) ??
      readString(uniqueArgs?.variant) ??
      readFirstString(tags?.variant) ??
      extractVariantFromUrl(clickUrl)
  );
}

function extractEmail(record: RawRecord) {
  const mail = getNestedRecord(record, "mail");
  const destination = mail ? mail.destination : null;

  return (
    readString(record.email) ??
    readString(record.recipient_email) ??
    readString(record.recipient) ??
    readFirstString(destination)
  );
}

function normalizeSendGridRecord(record: RawRecord): NormalizedEdmEvent | null {
  const eventType = normalizeEventType(readString(record.event));
  const url = readString(record.url);
  const rawCampaignId = extractCampaignId(record);
  const rawAutomationLogId = extractAutomationLogId(record);
  const rawAutomationRuleId = extractAutomationRuleId(record);
  const campaignId = isUuid(rawCampaignId) ? rawCampaignId : null;
  const automationLogId = isUuid(rawAutomationLogId) ? rawAutomationLogId : null;
  const automationRuleId = isUuid(rawAutomationRuleId) ? rawAutomationRuleId : null;
  const recipientEmail = extractEmail(record);

  if (!eventType || (!campaignId && !automationLogId) || !recipientEmail) {
    return null;
  }

  return {
    campaignId,
    automationLogId,
    automationRuleId,
    recipientEmail,
    eventType,
    url: eventType === "click" ? url : null,
    variant: extractVariant(record)
  };
}

function normalizeSesRecord(record: RawRecord): NormalizedEdmEvent | null {
  const eventType = normalizeEventType(
    readString(record.eventType) ?? readString(record.notificationType)
  );
  const click = getNestedRecord(record, "click");
  const bounce = getNestedRecord(record, "bounce");
  const url = readString(click?.link) ?? readString(record.url);
  const rawCampaignId = extractCampaignId(record) ?? extractCampaignIdFromUrl(url);
  const rawAutomationLogId = extractAutomationLogId(record);
  const rawAutomationRuleId = extractAutomationRuleId(record);
  const campaignId = isUuid(rawCampaignId) ? rawCampaignId : null;
  const automationLogId = isUuid(rawAutomationLogId) ? rawAutomationLogId : null;
  const automationRuleId = isUuid(rawAutomationRuleId) ? rawAutomationRuleId : null;
  const recipientEmail = extractEmail(record) ?? readFirstString(bounce?.bouncedRecipients);

  if (!eventType || (!campaignId && !automationLogId) || !recipientEmail) {
    return null;
  }

  return {
    campaignId,
    automationLogId,
    automationRuleId,
    recipientEmail,
    eventType,
    url: eventType === "click" ? url : null,
    variant: extractVariant(record)
  };
}

function parsePayload(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => {
      const record = asRecord(item);
      const normalized = record ? normalizeSendGridRecord(record) : null;
      return normalized ? [normalized] : [];
    });
  }

  const record = asRecord(payload);

  if (!record) {
    return [] as NormalizedEdmEvent[];
  }

  if (typeof record.Message === "string") {
    try {
      return parsePayload(JSON.parse(record.Message));
    } catch {
      return [] as NormalizedEdmEvent[];
    }
  }

  const records = Array.isArray(record.records) ? record.records : null;

  if (records) {
    return records.flatMap((item) => {
      const nextRecord = asRecord(item);
      const normalized = nextRecord
        ? normalizeSendGridRecord(nextRecord) ?? normalizeSesRecord(nextRecord)
        : null;
      return normalized ? [normalized] : [];
    });
  }

  const normalized = normalizeSendGridRecord(record) ?? normalizeSesRecord(record);
  return normalized ? [normalized] : [];
}

async function getEmailToUserId(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
) {
  const emailToUserId = new Map<string, string>();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      throw new Error(`Failed to load auth users: ${error.message}`);
    }

    const users = data.users ?? [];

    users.forEach((user) => {
      if (user.email) {
        emailToUserId.set(user.email.toLowerCase(), user.id);
      }
    });

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return emailToUserId;
}

async function updateOpenState({
  supabaseAdmin,
  event,
  emailToUserId
}: {
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
  event: NormalizedEdmEvent;
  emailToUserId: Map<string, string>;
}) {
  if (event.eventType !== "open") {
    return;
  }

  const openedAt = new Date().toISOString();

  if (event.automationLogId) {
    const { error } = await supabaseAdmin
      .from("edm_automation_logs")
      .update({ opened_at: openedAt })
      .eq("id", event.automationLogId);

    if (error) {
      console.error("[edm-webhook] Failed to update automation open state.", {
        event,
        error
      });
    }
  }

  const userId = emailToUserId.get(event.recipientEmail.toLowerCase());

  if (!userId) {
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("edm_lifecycle_tags")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("[edm-webhook] Failed to load profile lifecycle tags.", {
      event,
      error: profileError
    });
    return;
  }

  const tags = Array.isArray(profile?.edm_lifecycle_tags)
    ? profile.edm_lifecycle_tags.filter((tag) => tag !== "inactive")
    : [];
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      last_opened_at: openedAt,
      edm_lifecycle_tags: tags
    })
    .eq("id", userId);

  if (error) {
    console.error("[edm-webhook] Failed to update profile open state.", {
      event,
      error
    });
  }
}

export async function POST(request: NextRequest) {
  const auth = isAuthorized(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured." },
      { status: 500 }
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const events = parsePayload(payload);
  let inserted = 0;
  let metricUpdates = 0;
  let emailToUserId: Map<string, string> | null = null;

  for (const event of events) {
    const { error: logError } = await supabaseAdmin.from("edm_tracking_logs").insert({
      campaign_id: event.campaignId,
      automation_log_id: event.automationLogId,
      automation_rule_id: event.automationRuleId,
      recipient_email: event.recipientEmail,
      event_type: event.eventType,
      url: event.url,
      variant: event.variant
    });

    if (logError) {
      console.error("[edm-webhook] Failed to write tracking log.", {
        event,
        error: logError
      });
      continue;
    }

    inserted += 1;

    if (event.eventType === "open") {
      try {
        emailToUserId = emailToUserId ?? (await getEmailToUserId(supabaseAdmin));
        await updateOpenState({
          supabaseAdmin,
          event,
          emailToUserId
        });
      } catch (error) {
        console.error("[edm-webhook] Failed to update open state.", {
          event,
          error
        });
      }
    }

    const targetMetric = metricByEventType[event.eventType];

    if (!targetMetric || !event.campaignId) {
      continue;
    }

    const { error: metricsError } = await supabaseAdmin.rpc(
      "increment_edm_campaign_metric",
      {
        target_campaign_id: event.campaignId,
        target_metric: targetMetric,
        increment_by: 1
      }
    );

    if (metricsError) {
      console.error("[edm-webhook] Failed to increment campaign metric.", {
        event,
        metric: targetMetric,
        error: metricsError
      });
      continue;
    }

    metricUpdates += 1;

    if (event.variant) {
      const { error: variantMetricsError } = await supabaseAdmin.rpc(
        "increment_edm_campaign_variant_metric",
        {
          target_campaign_id: event.campaignId,
          target_variant: event.variant,
          target_metric: targetMetric,
          increment_by: 1
        }
      );

      if (variantMetricsError) {
        console.error("[edm-webhook] Failed to increment variant metric.", {
          event,
          metric: targetMetric,
          error: variantMetricsError
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    received: Array.isArray(payload) ? payload.length : 1,
    parsed: events.length,
    inserted,
    metricUpdates
  });
}
