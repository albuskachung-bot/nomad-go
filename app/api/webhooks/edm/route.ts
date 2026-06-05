import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EdmTrackingEventType } from "@/lib/types";

type NormalizedEdmEvent = {
  campaignId: string;
  recipientEmail: string;
  eventType: EdmTrackingEventType;
  url: string | null;
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
  const campaignId = extractCampaignId(record);
  const recipientEmail = extractEmail(record);

  if (!eventType || !campaignId || !isUuid(campaignId) || !recipientEmail) {
    return null;
  }

  return {
    campaignId,
    recipientEmail,
    eventType,
    url: eventType === "click" ? url : null
  };
}

function normalizeSesRecord(record: RawRecord): NormalizedEdmEvent | null {
  const eventType = normalizeEventType(
    readString(record.eventType) ?? readString(record.notificationType)
  );
  const click = getNestedRecord(record, "click");
  const bounce = getNestedRecord(record, "bounce");
  const url = readString(click?.link) ?? readString(record.url);
  const campaignId = extractCampaignId(record) ?? extractCampaignIdFromUrl(url);
  const recipientEmail = extractEmail(record) ?? readFirstString(bounce?.bouncedRecipients);

  if (!eventType || !campaignId || !isUuid(campaignId) || !recipientEmail) {
    return null;
  }

  return {
    campaignId,
    recipientEmail,
    eventType,
    url: eventType === "click" ? url : null
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

  for (const event of events) {
    const { error: logError } = await supabaseAdmin.from("edm_tracking_logs").insert({
      campaign_id: event.campaignId,
      recipient_email: event.recipientEmail,
      event_type: event.eventType,
      url: event.url
    });

    if (logError) {
      console.error("[edm-webhook] Failed to write tracking log.", {
        event,
        error: logError
      });
      continue;
    }

    inserted += 1;

    const targetMetric = metricByEventType[event.eventType];

    if (!targetMetric) {
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
  }

  return NextResponse.json({
    ok: true,
    received: Array.isArray(payload) ? payload.length : 1,
    parsed: events.length,
    inserted,
    metricUpdates
  });
}
