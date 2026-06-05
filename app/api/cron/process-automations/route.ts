import { NextRequest, NextResponse } from "next/server";
import { sendAutomationOmnichannelFallback } from "@/lib/edm/omnichannel";
import { injectEdmUtmParameters } from "@/lib/edm/utm-injector";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EdmAutomationLog, EdmAutomationRule, Order, Profile } from "@/lib/types";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

type OrderAutomationRow = Pick<
  Order,
  "id" | "user_id" | "created_at" | "departure_at"
>;

type AutomationCandidate = {
  userId: string;
  referenceId: string;
  email: string;
  name: string;
  variables: Record<string, string>;
};

type ProcessedRuleResult = {
  ruleId: string;
  trigger: EdmAutomationRule["event_trigger"];
  candidates: number;
  sent: number;
  skipped: number;
};

type FallbackResult = {
  candidates: number;
  sent: number;
  skipped: number;
  failed: number;
};

export const dynamic = "force-dynamic";

const cronWindowHours = 24;
const maxCandidatesPerRule = 500;
const maxFallbackCandidates = 500;

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : null;
}

function assertAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return {
      ok: false,
      status: 500,
      message: "CRON_SECRET is not configured."
    };
  }

  if (getBearerToken(request) !== cronSecret) {
    return {
      ok: false,
      status: 401,
      message: "Unauthorized cron request."
    };
  }

  return {
    ok: true,
    status: 200,
    message: "Authorized."
  };
}

function hoursAgo(hours: number, now = new Date()) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

function hoursFromNow(hours: number, now = new Date()) {
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function getRecipientName(profile: Pick<Profile, "full_name" | "title">, email: string) {
  return (
    profile.full_name?.trim() ||
    profile.title?.trim() ||
    email.split("@")[0] ||
    "NOMAD-GO 會員"
  );
}

function renderTemplate(template: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce(
    (output, [key, value]) => output.replaceAll(`{{${key}}}`, value),
    template
  );
}

function getAutomationFallbackMessage(rule: EdmAutomationRule) {
  return (
    rule.fallback_message?.trim() ||
    "重要提醒：請回到 NOMAD-GO 查看你的最新通知與行前準備事項。"
  );
}

async function getAuthEmailByUserId(supabaseAdmin: AdminClient) {
  const emailByUserId = new Map<string, string>();
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
        emailByUserId.set(user.id, user.email);
      }
    });

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return emailByUserId;
}

async function hydrateOrderCandidates(
  supabaseAdmin: AdminClient,
  rows: OrderAutomationRow[],
  extraVariables: (row: OrderAutomationRow) => Record<string, string>
) {
  if (rows.length === 0) {
    return [] as AutomationCandidate[];
  }

  const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id,full_name,title,email_bounced")
    .in("id", userIds);

  if (error) {
    throw new Error(`Failed to load automation profiles: ${error.message}`);
  }

  const profileById = new Map(
    (
      (profiles ?? []) as Pick<
        Profile,
        "id" | "full_name" | "title" | "email_bounced"
      >[]
    )
      .filter((profile) => profile.email_bounced !== true)
      .map((profile) => [profile.id, profile])
  );
  const emailByUserId = await getAuthEmailByUserId(supabaseAdmin);
  const candidates: AutomationCandidate[] = [];

  rows.forEach((row) => {
    const email = emailByUserId.get(row.user_id);
    const profile = profileById.get(row.user_id);

    if (!email || !profile) {
      return;
    }

    const name = getRecipientName(profile, email);

    candidates.push({
      userId: row.user_id,
      referenceId: row.id,
      email,
      name,
      variables: {
        user_name: name,
        order_id: row.id,
        order_created_at: formatDate(row.created_at),
        departure_at: formatDate(row.departure_at),
        ...extraVariables(row)
      }
    });
  });

  return candidates;
}

async function getCartAbandonedCandidates(
  rule: EdmAutomationRule,
  supabaseAdmin: AdminClient,
  now: Date
) {
  const cutoff = hoursAgo(rule.delay_hours, now).toISOString();
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id,user_id,created_at,departure_at")
    .eq("status", "pending")
    .lte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(maxCandidatesPerRule);

  if (error) {
    throw new Error(`Failed to load cart abandoned candidates: ${error.message}`);
  }

  return hydrateOrderCandidates(
    supabaseAdmin,
    (data ?? []) as OrderAutomationRow[],
    () => ({})
  );
}

async function getEsimExpiryReminderCandidates(
  rule: EdmAutomationRule,
  supabaseAdmin: AdminClient,
  now: Date
) {
  const targetEnd = hoursAgo(rule.delay_hours, now);
  const targetStart = hoursAgo(rule.delay_hours + cronWindowHours, now);
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id,user_id,created_at,departure_at")
    .eq("status", "paid")
    .eq("product_type", "esim")
    .gte("created_at", targetStart.toISOString())
    .lt("created_at", targetEnd.toISOString())
    .order("created_at", { ascending: true })
    .limit(maxCandidatesPerRule);

  if (error) {
    throw new Error(`Failed to load eSIM expiry candidates: ${error.message}`);
  }

  return hydrateOrderCandidates(
    supabaseAdmin,
    (data ?? []) as OrderAutomationRow[],
    () => ({
      esim_warning: "eSIM 須於購買後 30 天內完成安裝與啟用，逾期將無法使用"
    })
  );
}

async function getPreTripCandidates(
  rule: EdmAutomationRule,
  supabaseAdmin: AdminClient,
  now: Date
) {
  const targetStart = hoursFromNow(rule.delay_hours, now);
  const targetEnd = hoursFromNow(rule.delay_hours + cronWindowHours, now);
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id,user_id,created_at,departure_at")
    .eq("status", "paid")
    .not("departure_at", "is", null)
    .gte("departure_at", targetStart.toISOString())
    .lt("departure_at", targetEnd.toISOString())
    .order("departure_at", { ascending: true })
    .limit(maxCandidatesPerRule);

  if (error) {
    throw new Error(`Failed to load pre-trip candidates: ${error.message}`);
  }

  return hydrateOrderCandidates(
    supabaseAdmin,
    (data ?? []) as OrderAutomationRow[],
    () => ({
      weather_summary: "TODO: 串接目的地天氣 API 後替換此段內容。",
      travel_checklist: "確認護照、簽證、保險、住宿、網路與付款方式。"
    })
  );
}

async function getCandidatesForRule(
  rule: EdmAutomationRule,
  supabaseAdmin: AdminClient,
  now: Date
) {
  if (rule.event_trigger === "cart_abandoned") {
    return getCartAbandonedCandidates(rule, supabaseAdmin, now);
  }

  if (rule.event_trigger === "esim_expiry_reminder") {
    return getEsimExpiryReminderCandidates(rule, supabaseAdmin, now);
  }

  if (rule.event_trigger === "pre_trip") {
    return getPreTripCandidates(rule, supabaseAdmin, now);
  }

  return [] as AutomationCandidate[];
}

async function insertAutomationLog({
  rule,
  candidate,
  supabaseAdmin
}: {
  rule: EdmAutomationRule;
  candidate: AutomationCandidate;
  supabaseAdmin: AdminClient;
}) {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("edm_automation_logs")
    .insert({
      rule_id: rule.id,
      user_id: candidate.userId,
      reference_id: candidate.referenceId,
      recipient_email: candidate.email,
      email_sent_at: now,
      opened_at: null,
      fallback_channel: null,
      fallback_sent_at: null,
      triggered_at: now,
      status: "sent"
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to write automation log: ${error.message}`);
  }

  return data as EdmAutomationLog;
}

async function filterAlreadyTriggeredCandidates(
  rule: EdmAutomationRule,
  candidates: AutomationCandidate[],
  supabaseAdmin: AdminClient
) {
  if (candidates.length === 0) {
    return {
      freshCandidates: [] as AutomationCandidate[],
      skipped: 0
    };
  }

  const referenceIds = candidates.map((candidate) => candidate.referenceId);
  const { data: logs, error } = await supabaseAdmin
    .from("edm_automation_logs")
    .select("reference_id")
    .eq("rule_id", rule.id)
    .in("reference_id", referenceIds);

  if (error) {
    throw new Error(`Failed to load automation logs: ${error.message}`);
  }

  const sentReferenceIds = new Set(
    ((logs ?? []) as Array<{ reference_id: string | null }>).flatMap((log) =>
      log.reference_id ? [log.reference_id] : []
    )
  );
  const freshCandidates = candidates.filter(
    (candidate) => !sentReferenceIds.has(candidate.referenceId)
  );

  return {
    freshCandidates,
    skipped: candidates.length - freshCandidates.length
  };
}

async function processRule(
  rule: EdmAutomationRule,
  supabaseAdmin: AdminClient,
  now: Date
): Promise<ProcessedRuleResult> {
  const candidates = await getCandidatesForRule(rule, supabaseAdmin, now);
  const { freshCandidates, skipped } = await filterAlreadyTriggeredCandidates(
    rule,
    candidates,
    supabaseAdmin
  );
  let sent = 0;

  for (const candidate of freshCandidates) {
    const subject = renderTemplate(rule.email_subject, candidate.variables);
    const automationLog = await insertAutomationLog({
      rule,
      candidate,
      supabaseAdmin
    });
    const html = injectEdmUtmParameters(
      renderTemplate(rule.email_content, candidate.variables),
      `automation-${rule.id}`
    );

    // TODO: 串接 SendGrid/SES API
    console.log("[edm-automation] Simulated automation dispatch", {
      ruleId: rule.id,
      trigger: rule.event_trigger,
      to: candidate.email,
      subject,
      trackingArgs: {
        automation_log_id: automationLog.id,
        automation_rule_id: rule.id
      },
      html
    });

    sent += 1;
  }

  return {
    ruleId: rule.id,
    trigger: rule.event_trigger,
    candidates: candidates.length,
    sent,
    skipped
  };
}

async function processCriticalFallbacks(
  supabaseAdmin: AdminClient,
  now: Date
): Promise<FallbackResult> {
  const { data: rulesData, error: rulesError } = await supabaseAdmin
    .from("edm_automation_rules")
    .select("*")
    .eq("is_active", true)
    .eq("is_critical", true);

  if (rulesError) {
    throw new Error(`Failed to load critical automation rules: ${rulesError.message}`);
  }

  const rules = (rulesData ?? []) as EdmAutomationRule[];

  if (rules.length === 0) {
    return {
      candidates: 0,
      sent: 0,
      skipped: 0,
      failed: 0
    };
  }

  const ruleById = new Map(rules.map((rule) => [rule.id, rule]));
  const { data: logsData, error: logsError } = await supabaseAdmin
    .from("edm_automation_logs")
    .select("*")
    .in("rule_id", rules.map((rule) => rule.id))
    .eq("status", "sent")
    .is("opened_at", null)
    .is("fallback_sent_at", null)
    .order("triggered_at", { ascending: true })
    .limit(maxFallbackCandidates);

  if (logsError) {
    throw new Error(`Failed to load critical automation logs: ${logsError.message}`);
  }

  const dueLogs = ((logsData ?? []) as EdmAutomationLog[]).filter((log) => {
    const rule = ruleById.get(log.rule_id);
    const triggeredAt = new Date(log.triggered_at);

    if (!rule || Number.isNaN(triggeredAt.getTime())) {
      return false;
    }

    const dueAt =
      triggeredAt.getTime() + (rule.fallback_delay_hours ?? 24) * 60 * 60 * 1000;
    return dueAt <= now.getTime();
  });

  if (dueLogs.length === 0) {
    return {
      candidates: 0,
      sent: 0,
      skipped: 0,
      failed: 0
    };
  }

  const { data: openedLogs, error: openedError } = await supabaseAdmin
    .from("edm_tracking_logs")
    .select("automation_log_id")
    .in("automation_log_id", dueLogs.map((log) => log.id))
    .eq("event_type", "open");

  if (openedError) {
    throw new Error(`Failed to load automation open logs: ${openedError.message}`);
  }

  const openedLogIds = new Set(
    ((openedLogs ?? []) as Array<{ automation_log_id: string | null }>).flatMap(
      (log) => (log.automation_log_id ? [log.automation_log_id] : [])
    )
  );
  const unopenedLogs = dueLogs.filter((log) => !openedLogIds.has(log.id));
  const userIds = Array.from(
    new Set(unopenedLogs.map((log) => log.user_id).filter((id): id is string => Boolean(id)))
  );

  if (userIds.length === 0) {
    return {
      candidates: dueLogs.length,
      sent: 0,
      skipped: dueLogs.length,
      failed: 0
    };
  }

  const { data: profilesData, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .in("id", userIds)
    .eq("is_banned", false);

  if (profilesError) {
    throw new Error(`Failed to load fallback profiles: ${profilesError.message}`);
  }

  const profileById = new Map(
    ((profilesData ?? []) as Profile[]).map((profile) => [profile.id, profile])
  );
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const log of unopenedLogs) {
    const rule = ruleById.get(log.rule_id);
    const profile = log.user_id ? profileById.get(log.user_id) : null;

    if (!rule || !profile) {
      skipped += 1;
      continue;
    }

    try {
      const name = getRecipientName(profile, log.recipient_email ?? "member@nomad-go");
      const message = renderTemplate(getAutomationFallbackMessage(rule), {
        user_name: name,
        reference_id: log.reference_id ?? "",
        automation_log_id: log.id
      });
      const result = await sendAutomationOmnichannelFallback({
        supabaseAdmin,
        rule,
        automationLog: log,
        profile,
        message
      });

      if (result.sent) {
        sent += 1;
      } else if (result.status === "failed") {
        failed += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      failed += 1;
      console.error("[edm-automation] Failed to send fallback.", {
        automationLogId: log.id,
        ruleId: log.rule_id,
        error
      });
    }
  }

  return {
    candidates: dueLogs.length,
    sent,
    skipped,
    failed
  };
}

export async function POST(request: NextRequest) {
  const auth = assertAuthorized(request);

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

  const { data, error } = await supabaseAdmin
    .from("edm_automation_rules")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rules = (data ?? []) as EdmAutomationRule[];
  const now = new Date();
  const processedRules: ProcessedRuleResult[] = [];

  for (const rule of rules) {
    try {
      processedRules.push(await processRule(rule, supabaseAdmin, now));
    } catch (ruleError) {
      console.error("[edm-automation] Failed to process automation rule.", {
        ruleId: rule.id,
        trigger: rule.event_trigger,
        error: ruleError
      });
      processedRules.push({
        ruleId: rule.id,
        trigger: rule.event_trigger,
        candidates: 0,
        sent: 0,
        skipped: 0
      });
    }
  }

  let fallback: FallbackResult = {
    candidates: 0,
    sent: 0,
    skipped: 0,
    failed: 0
  };

  try {
    fallback = await processCriticalFallbacks(supabaseAdmin, now);
  } catch (fallbackError) {
    console.error("[edm-automation] Failed to process critical fallbacks.", {
      error: fallbackError
    });
  }

  return NextResponse.json({
    ok: true,
    processedAt: now.toISOString(),
    ruleCount: rules.length,
    rules: processedRules,
    criticalFallback: fallback
  });
}
