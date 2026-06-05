"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminContext } from "@/lib/admin";
import { injectEdmUtmParameters } from "@/lib/edm/utm-injector";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Database,
  EdmAudienceSegment,
  EdmAutomationRule,
  EdmAutomationTrigger,
  EdmCampaign,
  EdmProvider,
  Profile
} from "@/lib/types";

type ActionResult = {
  ok: boolean;
  message: string;
  campaignId?: string;
  ruleId?: string;
};

type DispatchRecipient = {
  id: string;
  email: string;
  name: string;
};

const edmSettingsId = "00000000-0000-0000-0000-000000000001";
const edmProviders = new Set<EdmProvider>(["none", "sendgrid", "ses"]);
const edmAudiences = new Set<EdmAudienceSegment>(["all", "paid", "free"]);
const edmAutomationTriggers = new Set<EdmAutomationTrigger>([
  "cart_abandoned",
  "esim_expiry_reminder",
  "pre_trip"
]);
const esimExpiryWarning =
  "eSIM 須於購買後 30 天內完成安裝與啟用，逾期將無法使用";

function readText(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function readOptionalText(value: FormDataEntryValue | null) {
  const text = readText(value);
  return text.length > 0 ? text : null;
}

function readProvider(value: FormDataEntryValue | null): EdmProvider {
  const provider = readText(value) as EdmProvider;
  return edmProviders.has(provider) ? provider : "none";
}

function readAudience(value: FormDataEntryValue | null): EdmAudienceSegment {
  const audience = readText(value) as EdmAudienceSegment;
  return edmAudiences.has(audience) ? audience : "all";
}

function readAutomationTrigger(value: FormDataEntryValue | null): EdmAutomationTrigger {
  const trigger = readText(value) as EdmAutomationTrigger;
  return edmAutomationTriggers.has(trigger) ? trigger : "cart_abandoned";
}

function readNonNegativeInteger(value: FormDataEntryValue | null) {
  const parsedValue = Number.parseInt(readText(value), 10);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "EDM 操作失敗，請稍後再試。";
}

async function requireSuperAdmin() {
  const context = await getCurrentAdminContext();

  if (!context.supabase || !context.user) {
    redirect("/admin/login");
  }

  if (!context.isSuperAdmin && context.profile?.role !== "super_admin") {
    redirect("/admin");
  }

  return context;
}

async function getWritableSupabase() {
  const context = await requireSuperAdmin();
  return createSupabaseAdminClient() ?? context.supabase;
}

function toScheduledAt(value: FormDataEntryValue | null) {
  const text = readText(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getRecipientName(profile: Pick<Profile, "full_name" | "title">, email: string) {
  return (
    profile.full_name?.trim() ||
    profile.title?.trim() ||
    email.split("@")[0] ||
    "NOMAD-GO 會員"
  );
}

function renderPersonalizedHtml(content: string, recipient: DispatchRecipient) {
  return content.replaceAll("{{user_name}}", recipient.name);
}

async function getAuthEmailByUserId(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
) {
  const emailByUserId = new Map<string, string>();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      throw new Error(`讀取 Auth 使用者 Email 失敗：${error.message}`);
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

async function getCampaignRecipients(
  campaign: EdmCampaign,
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
) {
  const audience = campaign.target_segment?.audience ?? "all";
  let query = supabaseAdmin
    .from("profiles")
    .select("id,full_name,title,subscription_plan,is_banned,is_virtual_author")
    .eq("is_banned", false)
    .eq("is_virtual_author", false);

  if (audience === "paid") {
    query = query.in("subscription_plan", ["pro", "vip"]);
  }

  if (audience === "free") {
    query = query.or("subscription_plan.eq.free,subscription_plan.is.null");
  }

  const { data: profiles, error } = await query;

  if (error) {
    throw new Error(`讀取 EDM 收件名單失敗：${error.message}`);
  }

  const emailByUserId = await getAuthEmailByUserId(supabaseAdmin);

  return ((profiles ?? []) as Pick<Profile, "id" | "full_name" | "title">[])
    .map((profile) => {
      const email = emailByUserId.get(profile.id);

      if (!email) {
        return null;
      }

      return {
        id: profile.id,
        email,
        name: getRecipientName(profile, email)
      };
    })
    .filter((recipient): recipient is DispatchRecipient => recipient !== null);
}

export async function saveEdmSettings(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await getWritableSupabase();
    const provider = readProvider(formData.get("provider"));
    const apiKey = readOptionalText(formData.get("api_key"));
    const senderName = readOptionalText(formData.get("sender_name"));
    const senderEmail = readOptionalText(formData.get("sender_email"));

    if (senderEmail && !isValidEmail(senderEmail)) {
      return {
        ok: false,
        message: "請輸入有效的預設寄件人 Email。"
      };
    }

    const { data: existingSettings, error: loadError } = await supabase
      .from("edm_settings")
      .select("api_key")
      .eq("id", edmSettingsId)
      .maybeSingle();

    if (loadError) {
      return {
        ok: false,
        message: loadError.message
      };
    }

    const nextApiKey =
      provider === "none" ? null : apiKey ?? existingSettings?.api_key ?? null;

    const payload: Database["public"]["Tables"]["edm_settings"]["Insert"] = {
      id: edmSettingsId,
      provider,
      api_key: nextApiKey,
      sender_name: senderName,
      sender_email: senderEmail
    };

    const { error } = await supabase
      .from("edm_settings")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      return {
        ok: false,
        message: error.message
      };
    }

    revalidatePath("/admin/settings/integrations");

    return {
      ok: true,
      message: "EDM 發信服務設定已更新。"
    };
  } catch (error) {
    console.error("[edm] Failed to save EDM settings.", error);

    return {
      ok: false,
      message: getErrorMessage(error)
    };
  }
}

export async function saveEdmCampaign(formData: FormData): Promise<ActionResult> {
  try {
    const context = await requireSuperAdmin();
    const supabase = createSupabaseAdminClient() ?? context.supabase;
    const campaignId = readOptionalText(formData.get("campaign_id"));
    const name = readText(formData.get("name"));
    const subject = readText(formData.get("subject"));
    const content = readText(formData.get("content"));
    const audience = readAudience(formData.get("audience"));
    const scheduledAt = toScheduledAt(formData.get("scheduled_at"));
    const intent = readText(formData.get("intent"));
    const status = intent === "schedule" && scheduledAt ? "scheduled" : "draft";

    if (!name) {
      return {
        ok: false,
        message: "請輸入 EDM 活動名稱。"
      };
    }

    if (!subject) {
      return {
        ok: false,
        message: "請輸入信件主旨。"
      };
    }

    if (!content) {
      return {
        ok: false,
        message: "請輸入 EDM HTML 內容。"
      };
    }

    if (intent === "schedule" && !scheduledAt) {
      return {
        ok: false,
        message: "排程發送前請選擇有效的預計發送時間。"
      };
    }

    const payload: Database["public"]["Tables"]["edm_campaigns"]["Insert"] = {
      name,
      subject,
      content,
      target_segment: {
        audience
      },
      status,
      scheduled_at: scheduledAt,
      created_by: context.user?.id ?? null
    };

    let savedCampaign: Pick<EdmCampaign, "id"> | null = null;

    if (campaignId) {
      const updatePayload: Database["public"]["Tables"]["edm_campaigns"]["Update"] = {
        name,
        subject,
        content,
        target_segment: {
          audience
        },
        status,
        scheduled_at: scheduledAt
      };

      const { data, error } = await supabase
        .from("edm_campaigns")
        .update(updatePayload)
        .eq("id", campaignId)
        .select("id")
        .single();

      if (error) {
        return {
          ok: false,
          message: error.message
        };
      }

      savedCampaign = data as Pick<EdmCampaign, "id">;
    } else {
      const { data, error } = await supabase
        .from("edm_campaigns")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        return {
          ok: false,
          message: error.message
        };
      }

      savedCampaign = data as Pick<EdmCampaign, "id">;
    }

    revalidatePath("/admin/edm");
    revalidatePath("/admin/edm/create");

    return {
      ok: true,
      message: status === "scheduled" ? "EDM 任務已排程。" : "EDM 草稿已儲存。",
      campaignId: savedCampaign?.id
    };
  } catch (error) {
    console.error("[edm] Failed to save EDM campaign.", error);

    return {
      ok: false,
      message: getErrorMessage(error)
    };
  }
}

export async function saveEdmAutomationRule(formData: FormData): Promise<ActionResult> {
  try {
    const context = await requireSuperAdmin();
    const supabase = createSupabaseAdminClient() ?? context.supabase;
    const ruleId = readOptionalText(formData.get("rule_id"));
    const name = readText(formData.get("name"));
    const eventTrigger = readAutomationTrigger(formData.get("event_trigger"));
    const delayHours = readNonNegativeInteger(formData.get("delay_hours"));
    const emailSubject = readText(formData.get("email_subject"));
    const emailContent = readText(formData.get("email_content"));
    const isActive = formData.get("is_active") === "true";

    if (!name) {
      return {
        ok: false,
        message: "請輸入自動化規則名稱。"
      };
    }

    if (!emailSubject) {
      return {
        ok: false,
        message: "請輸入自動化信件主旨。"
      };
    }

    if (!emailContent) {
      return {
        ok: false,
        message: "請輸入自動化信件 HTML 內容。"
      };
    }

    if (
      eventTrigger === "esim_expiry_reminder" &&
      !emailContent.includes(esimExpiryWarning)
    ) {
      return {
        ok: false,
        message: `eSIM 效期提醒模板必須包含：「${esimExpiryWarning}」。`
      };
    }

    const payload: Database["public"]["Tables"]["edm_automation_rules"]["Insert"] = {
      name,
      event_trigger: eventTrigger,
      delay_hours: delayHours,
      email_subject: emailSubject,
      email_content: emailContent,
      is_active: isActive
    };

    let savedRule: Pick<EdmAutomationRule, "id"> | null = null;

    if (ruleId) {
      const updatePayload: Database["public"]["Tables"]["edm_automation_rules"]["Update"] =
        payload;

      const { data, error } = await supabase
        .from("edm_automation_rules")
        .update(updatePayload)
        .eq("id", ruleId)
        .select("id")
        .single();

      if (error) {
        return {
          ok: false,
          message: error.message
        };
      }

      savedRule = data as Pick<EdmAutomationRule, "id">;
    } else {
      const { data, error } = await supabase
        .from("edm_automation_rules")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        return {
          ok: false,
          message: error.message
        };
      }

      savedRule = data as Pick<EdmAutomationRule, "id">;
    }

    revalidatePath("/admin/edm/automations");

    return {
      ok: true,
      message: ruleId ? "自動化規則已更新。" : "自動化規則已建立。",
      ruleId: savedRule?.id
    };
  } catch (error) {
    console.error("[edm] Failed to save EDM automation rule.", error);

    return {
      ok: false,
      message: getErrorMessage(error)
    };
  }
}

export async function dispatchCampaign(campaignId: string): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const supabaseAdmin = createSupabaseAdminClient();

    if (!supabaseAdmin) {
      return {
        ok: false,
        message: "尚未設定 SUPABASE_SERVICE_ROLE_KEY，無法讀取 Auth Email 或執行 EDM 發送。"
      };
    }

    const { data: campaignData, error: campaignError } = await supabaseAdmin
      .from("edm_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError) {
      return {
        ok: false,
        message: campaignError.message
      };
    }

    const campaign = campaignData as EdmCampaign | null;

    if (!campaign) {
      return {
        ok: false,
        message: "找不到指定的 EDM 任務。"
      };
    }

    await supabaseAdmin
      .from("edm_campaigns")
      .update({ status: "sending" })
      .eq("id", campaign.id);

    const recipients = await getCampaignRecipients(campaign, supabaseAdmin);

    recipients.forEach((recipient) => {
      const personalizedHtml = renderPersonalizedHtml(campaign.content, recipient);
      const html = injectEdmUtmParameters(personalizedHtml, campaign.id);

      // TODO: 串接 SendGrid/SES API
      console.log("[edm] Simulated campaign dispatch", {
        campaignId: campaign.id,
        to: recipient.email,
        subject: campaign.subject,
        trackingArgs: {
          campaign_id: campaign.id
        },
        html
      });
    });

    if (recipients.length > 0) {
      const { error: metricsError } = await supabaseAdmin.rpc(
        "increment_edm_campaign_metric",
        {
          target_campaign_id: campaign.id,
          target_metric: "sent_count",
          increment_by: recipients.length
        }
      );

      if (metricsError) {
        return {
          ok: false,
          message: metricsError.message
        };
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("edm_campaigns")
      .update({ status: "completed" })
      .eq("id", campaign.id);

    if (updateError) {
      return {
        ok: false,
        message: updateError.message
      };
    }

    revalidatePath("/admin/edm");

    return {
      ok: true,
      message: `EDM 模擬發送完成，共處理 ${recipients.length} 位收件人。`,
      campaignId: campaign.id
    };
  } catch (error) {
    console.error("[edm] Failed to dispatch EDM campaign.", error);

    return {
      ok: false,
      message: getErrorMessage(error)
    };
  }
}

export async function dispatchCampaignFromForm(formData: FormData) {
  const campaignId = readText(formData.get("campaign_id"));

  if (!campaignId) {
    redirect("/admin/edm?error=missing-campaign");
  }

  const result = await dispatchCampaign(campaignId);
  const params = new URLSearchParams({
    [result.ok ? "notice" : "error"]: result.message
  });

  redirect(`/admin/edm?${params.toString()}`);
}
