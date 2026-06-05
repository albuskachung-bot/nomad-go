import { NextRequest, NextResponse } from "next/server";
import { injectEdmUtmParameters } from "@/lib/edm/utm-injector";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EdmAutomationRule, Profile } from "@/lib/types";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

type AuthEmailMaps = {
  emailToUserId: Map<string, string>;
  emailByUserId: Map<string, string>;
};

export const dynamic = "force-dynamic";

const bounceThreshold = 2;
const inactiveMonths = 6;
const maxBounceLogs = 10000;
const maxInactiveProfiles = 500;
const reEngagementReferenceId = "re_engagement_initial";

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

function getInactiveCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - inactiveMonths);
  return cutoff;
}

function renderTemplate(template: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce(
    (output, [key, value]) => output.replaceAll(`{{${key}}}`, value),
    template
  );
}

function getRecipientName(profile: Pick<Profile, "full_name" | "title">, email: string) {
  return (
    profile.full_name?.trim() ||
    profile.title?.trim() ||
    email.split("@")[0] ||
    "NOMAD-GO 會員"
  );
}

function allowsEmail(profile: Profile) {
  return profile.communication_preferences?.email !== false;
}

async function getAuthEmailMaps(supabaseAdmin: AdminClient): Promise<AuthEmailMaps> {
  const emailToUserId = new Map<string, string>();
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
        emailToUserId.set(user.email.toLowerCase(), user.id);
        emailByUserId.set(user.id, user.email);
      }
    });

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return {
    emailToUserId,
    emailByUserId
  };
}

async function processBouncedEmails(
  supabaseAdmin: AdminClient,
  emailToUserId: Map<string, string>
) {
  const { data, error } = await supabaseAdmin
    .from("edm_tracking_logs")
    .select("recipient_email")
    .eq("event_type", "bounce")
    .order("created_at", { ascending: false })
    .limit(maxBounceLogs);

  if (error) {
    throw new Error(`Failed to load bounce tracking logs: ${error.message}`);
  }

  const bounceCountByEmail = new Map<string, number>();

  ((data ?? []) as Array<{ recipient_email: string }>).forEach((row) => {
    const email = row.recipient_email.trim().toLowerCase();
    bounceCountByEmail.set(email, (bounceCountByEmail.get(email) ?? 0) + 1);
  });

  const bouncedUserIds = Array.from(bounceCountByEmail.entries())
    .filter(([, count]) => count >= bounceThreshold)
    .flatMap(([email]) => {
      const userId = emailToUserId.get(email);
      return userId ? [userId] : [];
    });

  if (bouncedUserIds.length === 0) {
    return {
      bouncedEmails: 0,
      updatedProfiles: 0
    };
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ email_bounced: true })
    .in("id", bouncedUserIds);

  if (updateError) {
    throw new Error(`Failed to update bounced profiles: ${updateError.message}`);
  }

  return {
    bouncedEmails: bouncedUserIds.length,
    updatedProfiles: bouncedUserIds.length
  };
}

async function getReEngagementRule(supabaseAdmin: AdminClient) {
  const { data, error } = await supabaseAdmin
    .from("edm_automation_rules")
    .select("*")
    .eq("event_trigger", "re_engagement")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load re-engagement rule: ${error.message}`);
  }

  return data as EdmAutomationRule | null;
}

async function getAlreadyReEngagedUserIds(
  supabaseAdmin: AdminClient,
  ruleId: string,
  userIds: string[]
) {
  if (userIds.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await supabaseAdmin
    .from("edm_automation_logs")
    .select("user_id")
    .eq("rule_id", ruleId)
    .eq("reference_id", reEngagementReferenceId)
    .in("user_id", userIds);

  if (error) {
    throw new Error(`Failed to load re-engagement logs: ${error.message}`);
  }

  return new Set(
    ((data ?? []) as Array<{ user_id: string | null }>).flatMap((row) =>
      row.user_id ? [row.user_id] : []
    )
  );
}

async function sendReEngagementEmail({
  supabaseAdmin,
  rule,
  profile,
  email
}: {
  supabaseAdmin: AdminClient;
  rule: EdmAutomationRule;
  profile: Profile;
  email: string;
}) {
  const userName = getRecipientName(profile, email);
  const variables = {
    user_name: userName,
    profile_id: profile.id
  };
  const now = new Date().toISOString();
  const { data: automationLog, error } = await supabaseAdmin
    .from("edm_automation_logs")
    .insert({
      rule_id: rule.id,
      user_id: profile.id,
      reference_id: reEngagementReferenceId,
      recipient_email: email,
      email_sent_at: now,
      opened_at: null,
      fallback_channel: null,
      fallback_sent_at: null,
      triggered_at: now,
      status: "sent"
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to write re-engagement automation log: ${error.message}`);
  }

  const subject = renderTemplate(rule.email_subject, variables);
  const html = injectEdmUtmParameters(
    renderTemplate(rule.email_content, variables),
    `automation-${rule.id}`
  );

  // TODO: 串接 SendGrid/SES API
  console.log("[edm-hygiene] Simulated re-engagement dispatch", {
    ruleId: rule.id,
    automationLogId: automationLog.id,
    to: email,
    subject,
    trackingArgs: {
      automation_log_id: automationLog.id,
      automation_rule_id: rule.id
    },
    html
  });
}

async function processInactiveProfiles(
  supabaseAdmin: AdminClient,
  emailByUserId: Map<string, string>,
  now: Date
) {
  const cutoff = getInactiveCutoff(now);
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("is_banned", false)
    .eq("is_virtual_author", false)
    .eq("email_bounced", false)
    .lt("last_opened_at", cutoff.toISOString())
    .order("last_opened_at", { ascending: true })
    .limit(maxInactiveProfiles);

  if (error) {
    throw new Error(`Failed to load inactive profiles: ${error.message}`);
  }

  const inactiveProfiles = ((data ?? []) as Profile[]).filter(
    (profile) => !(profile.edm_lifecycle_tags ?? []).includes("inactive")
  );

  if (inactiveProfiles.length === 0) {
    return {
      cutoff: cutoff.toISOString(),
      taggedProfiles: 0,
      reEngagementSent: 0,
      skipped: 0
    };
  }

  const rule = await getReEngagementRule(supabaseAdmin);
  const alreadySent = rule
    ? await getAlreadyReEngagedUserIds(
        supabaseAdmin,
        rule.id,
        inactiveProfiles.map((profile) => profile.id)
      )
    : new Set<string>();
  let taggedProfiles = 0;
  let reEngagementSent = 0;
  let skipped = 0;

  for (const profile of inactiveProfiles) {
    const tags = Array.from(new Set([...(profile.edm_lifecycle_tags ?? []), "inactive"]));
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ edm_lifecycle_tags: tags })
      .eq("id", profile.id);

    if (updateError) {
      throw new Error(`Failed to tag inactive profile: ${updateError.message}`);
    }

    taggedProfiles += 1;

    const email = emailByUserId.get(profile.id);

    if (!rule || !email || !allowsEmail(profile) || alreadySent.has(profile.id)) {
      skipped += 1;
      continue;
    }

    await sendReEngagementEmail({
      supabaseAdmin,
      rule,
      profile,
      email
    });
    reEngagementSent += 1;
  }

  return {
    cutoff: cutoff.toISOString(),
    taggedProfiles,
    reEngagementSent,
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

  try {
    const now = new Date();
    const { emailToUserId, emailByUserId } = await getAuthEmailMaps(supabaseAdmin);
    const bounce = await processBouncedEmails(supabaseAdmin, emailToUserId);
    const inactive = await processInactiveProfiles(
      supabaseAdmin,
      emailByUserId,
      now
    );

    return NextResponse.json({
      ok: true,
      processedAt: now.toISOString(),
      bounce,
      inactive
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "List hygiene failed.";
    console.error("[edm-hygiene] Failed to process list hygiene.", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
