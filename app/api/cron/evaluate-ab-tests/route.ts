import { NextRequest, NextResponse } from "next/server";
import { renderEdmDynamicBlocks } from "@/lib/edm/dynamic-block-renderer";
import { injectEdmUtmParameters } from "@/lib/edm/utm-injector";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  EdmCampaign,
  EdmCampaignRecipient,
  EdmCampaignVariantMetrics,
  EdmDynamicBlock,
  EdmVariant,
  Profile
} from "@/lib/types";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

type EvaluatedCampaign = {
  campaignId: string;
  name: string;
  winningVariant: "a" | "b";
  openCounts: {
    a: number;
    b: number;
  };
  waitingRecipients: number;
  sent: number;
};

export const dynamic = "force-dynamic";

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

function isCampaignDue(campaign: EdmCampaign, now = new Date()) {
  const durationHours = campaign.test_duration_hours ?? 24;
  const startedAt = new Date(campaign.updated_at ?? campaign.created_at);

  if (Number.isNaN(startedAt.getTime())) {
    return false;
  }

  const dueAt = startedAt.getTime() + durationHours * 60 * 60 * 1000;
  return dueAt <= now.getTime();
}

function getRecipientName(
  row: EdmCampaignRecipient,
  profile: Partial<Profile> | undefined
) {
  return (
    row.recipient_name?.trim() ||
    profile?.full_name?.trim() ||
    profile?.title?.trim() ||
    row.recipient_email.split("@")[0] ||
    "NOMAD-GO 會員"
  );
}

function getWinningSubject(campaign: EdmCampaign, winningVariant: "a" | "b") {
  if (winningVariant === "a") {
    return campaign.variant_a_subject?.trim() || campaign.subject;
  }

  return campaign.variant_b_subject?.trim() || campaign.subject;
}

function renderCampaignHtml({
  campaign,
  row,
  profile,
  blocks
}: {
  campaign: EdmCampaign;
  row: EdmCampaignRecipient;
  profile: Partial<Profile>;
  blocks: EdmDynamicBlock[];
}) {
  const recipientName = getRecipientName(row, profile);
  const personalizedHtml = campaign.content.replaceAll(
    "{{user_name}}",
    recipientName
  );
  const dynamicHtml = renderEdmDynamicBlocks(personalizedHtml, profile, blocks);
  return injectEdmUtmParameters(dynamicHtml, campaign.id);
}

function emptyVariantMetrics(
  campaignId: string,
  variant: EdmVariant
): EdmCampaignVariantMetrics {
  return {
    campaign_id: campaignId,
    variant,
    sent_count: 0,
    delivered_count: 0,
    open_count: 0,
    click_count: 0,
    bounce_count: 0,
    created_at: "",
    updated_at: ""
  };
}

function chooseWinningVariant(
  campaignId: string,
  metrics: EdmCampaignVariantMetrics[]
) {
  const metricsByVariant = new Map(
    metrics.map((metric) => [metric.variant, metric])
  );
  const variantA =
    metricsByVariant.get("a") ?? emptyVariantMetrics(campaignId, "a");
  const variantB =
    metricsByVariant.get("b") ?? emptyVariantMetrics(campaignId, "b");

  return {
    winningVariant:
      variantB.open_count > variantA.open_count ? ("b" as const) : ("a" as const),
    openCounts: {
      a: variantA.open_count,
      b: variantB.open_count
    }
  };
}

async function getDynamicBlocks(supabaseAdmin: AdminClient) {
  const { data, error } = await supabaseAdmin
    .from("edm_dynamic_blocks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load dynamic blocks: ${error.message}`);
  }

  return (data ?? []) as EdmDynamicBlock[];
}

async function getProfilesById(
  supabaseAdmin: AdminClient,
  rows: EdmCampaignRecipient[]
) {
  const userIds = Array.from(
    new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id)))
  );

  if (userIds.length === 0) {
    return new Map<string, Profile>();
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (error) {
    throw new Error(`Failed to load recipient profiles: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as Profile[]).map((profile) => [profile.id, profile])
  );
}

async function incrementSentMetrics(
  supabaseAdmin: AdminClient,
  campaignId: string,
  count: number
) {
  if (count <= 0) {
    return;
  }

  const { error: aggregateError } = await supabaseAdmin.rpc(
    "increment_edm_campaign_metric",
    {
      target_campaign_id: campaignId,
      target_metric: "sent_count",
      increment_by: count
    }
  );

  if (aggregateError) {
    throw new Error(`Failed to increment campaign sent count: ${aggregateError.message}`);
  }

  const { error: variantError } = await supabaseAdmin.rpc(
    "increment_edm_campaign_variant_metric",
    {
      target_campaign_id: campaignId,
      target_variant: "winner",
      target_metric: "sent_count",
      increment_by: count
    }
  );

  if (variantError) {
    throw new Error(`Failed to increment winner sent count: ${variantError.message}`);
  }
}

async function dispatchRemainingRecipients({
  supabaseAdmin,
  campaign,
  winningVariant,
  rows,
  blocks
}: {
  supabaseAdmin: AdminClient;
  campaign: EdmCampaign;
  winningVariant: "a" | "b";
  rows: EdmCampaignRecipient[];
  blocks: EdmDynamicBlock[];
}) {
  const profileById = await getProfilesById(supabaseAdmin, rows);
  const subject = getWinningSubject(campaign, winningVariant);
  const now = new Date().toISOString();
  let sent = 0;

  for (const row of rows) {
    const profile = row.user_id ? profileById.get(row.user_id) ?? {} : {};

    if ("email_bounced" in profile && profile.email_bounced === true) {
      const { error } = await supabaseAdmin
        .from("edm_campaign_recipients")
        .update({
          status: "skipped",
          variant: "winner"
        })
        .eq("id", row.id);

      if (error) {
        throw new Error(`Failed to skip bounced recipient: ${error.message}`);
      }

      continue;
    }

    const html = renderCampaignHtml({
      campaign,
      row,
      profile,
      blocks
    });

    // TODO: 串接 SendGrid/SES API
    console.log("[edm-ab] Simulated winning variant dispatch", {
      campaignId: campaign.id,
      to: row.recipient_email,
      subject,
      winningVariant,
      variant: "winner",
      trackingArgs: {
        campaign_id: campaign.id,
        variant: "winner"
      },
      html
    });

    const { error } = await supabaseAdmin
      .from("edm_campaign_recipients")
      .update({
        status: "sent",
        variant: "winner",
        sent_at: now
      })
      .eq("id", row.id);

    if (error) {
      throw new Error(`Failed to update recipient queue row: ${error.message}`);
    }

    sent += 1;
  }

  await incrementSentMetrics(supabaseAdmin, campaign.id, sent);
  return sent;
}

async function evaluateCampaign(
  supabaseAdmin: AdminClient,
  campaign: EdmCampaign,
  blocks: EdmDynamicBlock[]
): Promise<EvaluatedCampaign> {
  const { data: metricsData, error: metricsError } = await supabaseAdmin
    .from("edm_campaign_variant_metrics")
    .select("*")
    .eq("campaign_id", campaign.id)
    .in("variant", ["a", "b"]);

  if (metricsError) {
    throw new Error(`Failed to load A/B metrics: ${metricsError.message}`);
  }

  const { winningVariant, openCounts } = chooseWinningVariant(
    campaign.id,
    (metricsData ?? []) as EdmCampaignVariantMetrics[]
  );

  const { data: waitingRowsData, error: waitingRowsError } = await supabaseAdmin
    .from("edm_campaign_recipients")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("status", "waiting_for_ab_result")
    .order("created_at", { ascending: true });

  if (waitingRowsError) {
    throw new Error(`Failed to load waiting recipients: ${waitingRowsError.message}`);
  }

  const waitingRows = (waitingRowsData ?? []) as EdmCampaignRecipient[];

  const { error: startError } = await supabaseAdmin
    .from("edm_campaigns")
    .update({
      winning_variant: winningVariant,
      status: "sending"
    })
    .eq("id", campaign.id);

  if (startError) {
    throw new Error(`Failed to mark campaign as sending: ${startError.message}`);
  }

  const campaignForDispatch: EdmCampaign = {
    ...campaign,
    winning_variant: winningVariant,
    status: "sending"
  };
  const sent = await dispatchRemainingRecipients({
    supabaseAdmin,
    campaign: campaignForDispatch,
    winningVariant,
    rows: waitingRows,
    blocks
  });

  const { error: completedError } = await supabaseAdmin
    .from("edm_campaigns")
    .update({
      winning_variant: winningVariant,
      status: "completed"
    })
    .eq("id", campaign.id);

  if (completedError) {
    throw new Error(`Failed to mark campaign as completed: ${completedError.message}`);
  }

  return {
    campaignId: campaign.id,
    name: campaign.name,
    winningVariant,
    openCounts,
    waitingRecipients: waitingRows.length,
    sent
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

  const { data: campaignData, error: campaignError } = await supabaseAdmin
    .from("edm_campaigns")
    .select("*")
    .eq("is_ab_test", true)
    .eq("status", "waiting_for_ab_result")
    .is("winning_variant", null)
    .order("updated_at", { ascending: true });

  if (campaignError) {
    return NextResponse.json({ error: campaignError.message }, { status: 500 });
  }

  const campaigns = ((campaignData ?? []) as EdmCampaign[]).filter((campaign) =>
    isCampaignDue(campaign)
  );
  const blocks = await getDynamicBlocks(supabaseAdmin);
  const evaluated: EvaluatedCampaign[] = [];
  const failed: Array<{ campaignId: string; message: string }> = [];

  for (const campaign of campaigns) {
    try {
      evaluated.push(await evaluateCampaign(supabaseAdmin, campaign, blocks));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      failed.push({
        campaignId: campaign.id,
        message
      });
      console.error("[edm-ab] Failed to evaluate A/B campaign.", {
        campaignId: campaign.id,
        error
      });
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    dueCampaigns: campaigns.length,
    evaluated,
    failed
  });
}
