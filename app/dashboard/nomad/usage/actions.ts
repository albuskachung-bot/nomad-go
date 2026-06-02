"use server";

import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TalentSubscriptionPlan, UsageQuotaRpcRow } from "@/lib/types";

const FREE_AI_MONTHLY_LIMIT = 3;

export type UsageQuotaReason =
  | "quota_exceeded"
  | "not_authenticated"
  | "profile_not_found"
  | "config_missing"
  | "unknown";

export type UsageQuotaSnapshot = {
  isAuthenticated: boolean;
  plan: TalentSubscriptionPlan;
  usageCount: number;
  freeLimit: number;
  remaining: number | null;
  resetDate: string | null;
  isUnlimited: boolean;
};

export type CheckUsageQuotaResult = UsageQuotaSnapshot & {
  allowed: boolean;
  reason: UsageQuotaReason | null;
  message: string;
};

function normalizeTalentPlan(value: string | null | undefined): TalentSubscriptionPlan {
  return value === "pro" || value === "vip" ? value : "free";
}

function normalizeReason(value: string | null | undefined): UsageQuotaReason {
  if (
    value === "quota_exceeded" ||
    value === "not_authenticated" ||
    value === "profile_not_found" ||
    value === "config_missing"
  ) {
    return value;
  }

  return "unknown";
}

function getNextMonthlyResetDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

function getEffectiveUsageCount(usageCount: number | null | undefined, resetDate: string | null | undefined) {
  if (!resetDate) {
    return 0;
  }

  const parsedResetDate = new Date(resetDate);

  if (Number.isNaN(parsedResetDate.getTime()) || parsedResetDate <= new Date()) {
    return 0;
  }

  return Math.max(0, usageCount ?? 0);
}

function buildSnapshot(params: {
  isAuthenticated: boolean;
  plan?: string | null;
  usageCount?: number | null;
  freeLimit?: number | null;
  resetDate?: string | null;
}): UsageQuotaSnapshot {
  const plan = normalizeTalentPlan(params.plan);
  const isUnlimited = plan === "pro" || plan === "vip";
  const freeLimit = params.freeLimit ?? FREE_AI_MONTHLY_LIMIT;
  const effectiveUsageCount = isUnlimited
    ? Math.max(0, params.usageCount ?? 0)
    : getEffectiveUsageCount(params.usageCount, params.resetDate);
  const resetDate =
    params.resetDate && new Date(params.resetDate) > new Date()
      ? params.resetDate
      : getNextMonthlyResetDate().toISOString();

  return {
    isAuthenticated: params.isAuthenticated,
    plan,
    usageCount: effectiveUsageCount,
    freeLimit,
    remaining: isUnlimited ? null : Math.max(0, freeLimit - effectiveUsageCount),
    resetDate,
    isUnlimited
  };
}

function buildQuotaMessage(result: UsageQuotaSnapshot & { allowed: boolean; reason: UsageQuotaReason | null }) {
  if (!result.allowed) {
    if (result.reason === "quota_exceeded") {
      return "免費 AI 額度已用盡，升級 Pro 後可不限次數使用。";
    }

    if (result.reason === "not_authenticated") {
      return "請先登入後再使用 AI 功能。";
    }

    return "目前無法確認 AI 使用額度，請稍後再試。";
  }

  if (result.isUnlimited) {
    return "付費方案已解鎖不限次數 AI 功能。";
  }

  return `已使用 ${result.usageCount}/${result.freeLimit} 次免費 AI 額度。`;
}

export async function getUsageQuotaSnapshot(): Promise<UsageQuotaSnapshot> {
  noStore();

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return buildSnapshot({
      isAuthenticated: false,
      plan: "free",
      usageCount: 0,
      resetDate: null
    });
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return buildSnapshot({
      isAuthenticated: false,
      plan: "free",
      usageCount: 0,
      resetDate: null
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_plan,free_ai_usage_count,quota_reset_date")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    if (profileError) {
      console.error("[usage-quota] Failed to load quota snapshot.", profileError);
    }

    return buildSnapshot({
      isAuthenticated: true,
      plan: "free",
      usageCount: 0,
      resetDate: null
    });
  }

  return buildSnapshot({
    isAuthenticated: true,
    plan: profile.subscription_plan,
    usageCount: profile.free_ai_usage_count,
    resetDate: profile.quota_reset_date
  });
}

export async function checkUsageQuota(): Promise<CheckUsageQuotaResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const snapshot = buildSnapshot({
      isAuthenticated: false,
      plan: "free",
      usageCount: 0,
      resetDate: null
    });

    return {
      ...snapshot,
      allowed: false,
      reason: "config_missing",
      message: "尚未設定 Supabase 環境變數，無法確認 AI 使用額度。"
    };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const snapshot = buildSnapshot({
      isAuthenticated: false,
      plan: "free",
      usageCount: 0,
      resetDate: null
    });

    return {
      ...snapshot,
      allowed: false,
      reason: "not_authenticated",
      message: buildQuotaMessage({
        ...snapshot,
        allowed: false,
        reason: "not_authenticated"
      })
    };
  }

  const { data, error } = await supabase.rpc("consume_ai_usage_quota", {});

  if (error) {
    console.error("[usage-quota] Failed to consume AI quota.", error);

    const snapshot = await getUsageQuotaSnapshot();

    return {
      ...snapshot,
      allowed: false,
      reason: "unknown",
      message: "目前無法確認 AI 使用額度，請稍後再試。"
    };
  }

  const row = ((data ?? []) as UsageQuotaRpcRow[])[0];

  if (!row) {
    const snapshot = await getUsageQuotaSnapshot();

    return {
      ...snapshot,
      allowed: false,
      reason: "unknown",
      message: "目前無法確認 AI 使用額度，請稍後再試。"
    };
  }

  const snapshot = buildSnapshot({
    isAuthenticated: true,
    plan: row.subscription_plan,
    usageCount: row.usage_count,
    freeLimit: row.free_limit,
    resetDate: row.reset_date
  });
  const reason = row.allowed ? null : normalizeReason(row.reason);

  revalidatePath("/dashboard/nomad/resume");
  revalidatePath("/dashboard/nomad/billing");

  return {
    ...snapshot,
    allowed: row.allowed,
    reason,
    message: buildQuotaMessage({
      ...snapshot,
      allowed: row.allowed,
      reason
    })
  };
}
