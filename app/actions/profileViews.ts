"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileView } from "@/lib/types";

type ProfilePlanType = "free" | "pro" | "vip";

type ProfileViewsResult = {
  totalCount: number;
  views: ProfileView[];
  isLocked: boolean;
  planType: ProfilePlanType;
  error?: string;
};

function normalizePlanType(value: string | null | undefined): ProfilePlanType {
  return value === "pro" || value === "vip" ? value : "free";
}

export async function getProfileViews(userId: string): Promise<ProfileViewsResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      totalCount: 0,
      views: [],
      isLocked: false,
      planType: "free",
      error: "Supabase 尚未設定。"
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return {
      totalCount: 0,
      views: [],
      isLocked: false,
      planType: "free",
      error: "無權限讀取履歷瀏覽紀錄。"
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan_type")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return {
      totalCount: 0,
      views: [],
      isLocked: false,
      planType: "free",
      error: profileError.message
    };
  }

  const planType = normalizePlanType(profile?.plan_type);
  const { count, error: countError } = await supabase
    .from("profile_views")
    .select("*", { count: "exact", head: true })
    .eq("target_user_id", userId);

  if (countError) {
    return {
      totalCount: 0,
      views: [],
      isLocked: false,
      planType,
      error: countError.message
    };
  }

  let viewsQuery = supabase
    .from("profile_views")
    .select("*")
    .eq("target_user_id", userId)
    .order("viewed_at", { ascending: false });

  if (planType === "free") {
    viewsQuery = viewsQuery.limit(1);
  }

  const { data: views, error: viewsError } = await viewsQuery;

  if (viewsError) {
    return {
      totalCount: count ?? 0,
      views: [],
      isLocked: planType === "free" && (count ?? 0) > 0,
      planType,
      error: viewsError.message
    };
  }

  const visibleViews = (views ?? []) as ProfileView[];
  const totalCount = count ?? 0;

  return {
    totalCount,
    views: visibleViews,
    isLocked: planType === "free" && totalCount > visibleViews.length,
    planType
  };
}
