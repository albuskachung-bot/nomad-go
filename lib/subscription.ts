import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TalentSubscriptionPlan } from "@/lib/types";

export type UserPlan = {
  isPro: boolean;
  plan: TalentSubscriptionPlan;
  planExpiresAt: string | null;
};

function normalizeUserPlan(value: string | null | undefined): TalentSubscriptionPlan {
  return value === "pro" || value === "vip" ? value : "free";
}

function resolveUserPlan(
  plan: string | null | undefined,
  planExpiresAt: string | null | undefined
): UserPlan {
  const normalizedPlan = normalizeUserPlan(plan);
  const expiresAt = planExpiresAt ?? null;
  const isExpired = Boolean(expiresAt && new Date(expiresAt) <= new Date());
  const effectivePlan = isExpired ? "free" : normalizedPlan;

  return {
    isPro: effectivePlan === "pro" || effectivePlan === "vip",
    plan: effectivePlan,
    planExpiresAt: expiresAt
  };
}

export async function getUserPlan(userId: string): Promise<UserPlan> {
  if (!userId) {
    return resolveUserPlan("free", null);
  }

  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient());

  if (!supabase) {
    return resolveUserPlan("free", null);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("subscription_plan, plan_expires_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[subscription] Failed to load user plan.", error);
    return resolveUserPlan("free", null);
  }

  return resolveUserPlan(data?.subscription_plan, data?.plan_expires_at);
}
