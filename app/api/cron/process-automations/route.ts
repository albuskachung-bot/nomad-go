import { NextRequest, NextResponse } from "next/server";
import { injectEdmUtmParameters } from "@/lib/edm/utm-injector";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EdmAutomationRule, Order, Profile } from "@/lib/types";

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

export const dynamic = "force-dynamic";

const cronWindowHours = 24;
const maxCandidatesPerRule = 500;

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
    .select("id,full_name,title")
    .in("id", userIds);

  if (error) {
    throw new Error(`Failed to load automation profiles: ${error.message}`);
  }

  const profileById = new Map(
    ((profiles ?? []) as Pick<Profile, "id" | "full_name" | "title">[]).map(
      (profile) => [profile.id, profile]
    )
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
      html
    });

    const { error } = await supabaseAdmin.from("edm_automation_logs").insert({
      rule_id: rule.id,
      user_id: candidate.userId,
      reference_id: candidate.referenceId,
      status: "sent"
    });

    if (error) {
      throw new Error(`Failed to write automation log: ${error.message}`);
    }

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

  return NextResponse.json({
    ok: true,
    processedAt: now.toISOString(),
    ruleCount: rules.length,
    rules: processedRules
  });
}
