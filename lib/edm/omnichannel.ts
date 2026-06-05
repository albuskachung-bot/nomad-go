import type {
  EdmAutomationLog,
  EdmAutomationRule,
  EdmOmnichannelChannel,
  EdmOmnichannelSettings,
  Profile
} from "@/lib/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

type FallbackRequest = {
  supabaseAdmin: AdminClient;
  rule: EdmAutomationRule;
  automationLog: EdmAutomationLog;
  profile: Profile;
  message: string;
};

const omnichannelSettingsId = "00000000-0000-0000-0000-000000000002";

function isChannelEnabled(
  settings: EdmOmnichannelSettings | null,
  channel: EdmOmnichannelChannel
) {
  return settings?.enabled_channels?.[channel] === true;
}

function getPreference(profile: Profile, channel: EdmOmnichannelChannel) {
  return profile.communication_preferences?.[channel] !== false;
}

function getChannelDestination(profile: Profile, channel: EdmOmnichannelChannel) {
  const preferences = profile.communication_preferences;

  if (channel === "whatsapp") {
    return (
      preferences?.whatsapp_to?.trim() ||
      preferences?.phone_number?.trim() ||
      null
    );
  }

  return (
    preferences?.sms_to?.trim() ||
    preferences?.phone_number?.trim() ||
    null
  );
}

function chooseFallbackChannel(
  profile: Profile,
  settings: EdmOmnichannelSettings | null
) {
  const channels: EdmOmnichannelChannel[] = ["whatsapp", "sms"];

  return (
    channels.find(
      (channel) =>
        getPreference(profile, channel) &&
        isChannelEnabled(settings, channel) &&
        getChannelDestination(profile, channel)
    ) ?? null
  );
}

async function getOmnichannelSettings(supabaseAdmin: AdminClient) {
  const { data, error } = await supabaseAdmin
    .from("edm_omnichannel_settings")
    .select("*")
    .eq("id", omnichannelSettingsId)
    .maybeSingle();

  if (error) {
    throw new Error(`讀取全通路設定失敗：${error.message}`);
  }

  return (data as EdmOmnichannelSettings | null) ?? null;
}

function getTwilioFrom(
  settings: EdmOmnichannelSettings,
  channel: EdmOmnichannelChannel
) {
  if (channel === "whatsapp") {
    const from = settings.whatsapp_from?.trim();
    return from ? (from.startsWith("whatsapp:") ? from : `whatsapp:${from}`) : null;
  }

  return settings.sms_from?.trim() || null;
}

function getTwilioTo(phoneNumber: string, channel: EdmOmnichannelChannel) {
  if (channel === "whatsapp") {
    return phoneNumber.startsWith("whatsapp:")
      ? phoneNumber
      : `whatsapp:${phoneNumber}`;
  }

  return phoneNumber;
}

async function sendTwilioMessage({
  settings,
  channel,
  to,
  body
}: {
  settings: EdmOmnichannelSettings;
  channel: EdmOmnichannelChannel;
  to: string;
  body: string;
}) {
  if (settings.provider !== "twilio") {
    return {
      status: "skipped" as const,
      providerMessageId: null,
      reason: "omnichannel provider is not twilio"
    };
  }

  if (!settings.account_sid || !settings.auth_token) {
    return {
      status: "skipped" as const,
      providerMessageId: null,
      reason: "missing Twilio account credentials"
    };
  }

  const from = getTwilioFrom(settings, channel);

  if (!from && !settings.messaging_service_sid) {
    return {
      status: "skipped" as const,
      providerMessageId: null,
      reason: `missing Twilio sender for ${channel}`
    };
  }

  const bodyParams = new URLSearchParams({
    To: getTwilioTo(to, channel),
    Body: body
  });

  if (settings.messaging_service_sid) {
    bodyParams.set("MessagingServiceSid", settings.messaging_service_sid);
  } else if (from) {
    bodyParams.set("From", from);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${settings.account_sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${settings.account_sid}:${settings.auth_token}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: bodyParams
    }
  );

  const payload = (await response.json().catch(() => null)) as {
    sid?: string;
    message?: string;
  } | null;

  if (!response.ok) {
    return {
      status: "failed" as const,
      providerMessageId: payload?.sid ?? null,
      reason: payload?.message ?? `Twilio API failed with ${response.status}`
    };
  }

  return {
    status: "sent" as const,
    providerMessageId: payload?.sid ?? null,
    reason: null
  };
}

export async function sendAutomationOmnichannelFallback({
  supabaseAdmin,
  rule,
  automationLog,
  profile,
  message
}: FallbackRequest) {
  const settings = await getOmnichannelSettings(supabaseAdmin);
  const channel = chooseFallbackChannel(profile, settings);
  const attemptedAt = new Date().toISOString();

  if (!channel || !settings) {
    const { error } = await supabaseAdmin.from("edm_omnichannel_logs").insert({
      automation_log_id: automationLog.id,
      automation_rule_id: rule.id,
      campaign_id: null,
      user_id: profile.id,
      recipient_email: automationLog.recipient_email ?? null,
      recipient_phone: null,
      channel: channel ?? "sms",
      provider: settings?.provider ?? "none",
      provider_message_id: null,
      status: "skipped",
      message,
      conversion_event: null,
      conversion_at: null,
      metadata: {
        reason: settings
          ? "no allowed fallback channel or destination"
          : "omnichannel settings are not configured"
      }
    });

    if (error) {
      throw new Error(`寫入全通路略過紀錄失敗：${error.message}`);
    }

    const { error: updateError } = await supabaseAdmin
      .from("edm_automation_logs")
      .update({
        fallback_channel: channel,
        fallback_sent_at: attemptedAt
      })
      .eq("id", automationLog.id);

    if (updateError) {
      throw new Error(`更新自動化 fallback 略過狀態失敗：${updateError.message}`);
    }

    return {
      sent: false,
      channel: null,
      status: "skipped" as const
    };
  }

  const destination = getChannelDestination(profile, channel);

  if (!destination) {
    return {
      sent: false,
      channel,
      status: "skipped" as const
    };
  }

  const result = await sendTwilioMessage({
    settings,
    channel,
    to: destination,
    body: message
  });

  // TODO: 若導入其他供應商，在此依 provider 分派對應 API。
  console.log("[edm-omnichannel] Fallback dispatch", {
    ruleId: rule.id,
    automationLogId: automationLog.id,
    userId: profile.id,
    channel,
    to: destination,
    status: result.status,
    reason: result.reason
  });

  const { error: logError } = await supabaseAdmin.from("edm_omnichannel_logs").insert({
    automation_log_id: automationLog.id,
    automation_rule_id: rule.id,
    campaign_id: null,
    user_id: profile.id,
    recipient_email: automationLog.recipient_email ?? null,
    recipient_phone: destination,
    channel,
    provider: settings.provider,
    provider_message_id: result.providerMessageId,
    status: result.status,
    message,
    conversion_event: null,
    conversion_at: null,
    metadata: {
      reason: result.reason,
      fallback_delay_hours: rule.fallback_delay_hours ?? 24
    }
  });

  if (logError) {
    throw new Error(`寫入全通路發送紀錄失敗：${logError.message}`);
  }

  if (result.status === "sent") {
    // The automation log is updated below for every terminal fallback attempt.
  }

  const { error: updateError } = await supabaseAdmin
    .from("edm_automation_logs")
    .update({
      fallback_channel: channel,
      fallback_sent_at: attemptedAt
    })
    .eq("id", automationLog.id);

  if (updateError) {
    throw new Error(`更新自動化 fallback 狀態失敗：${updateError.message}`);
  }

  return {
    sent: result.status === "sent",
    channel,
    status: result.status
  };
}
