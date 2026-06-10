"use server";

import { getUserPlan } from "@/lib/subscription";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileView } from "@/lib/types";

type ProfileViewsResult = {
  totalCount: number;
  views: ProfileView[];
  isLocked: boolean;
  plan: string;
  error?: string;
};

export async function getProfileViews(userId: string): Promise<ProfileViewsResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      totalCount: 0,
      views: [],
      isLocked: false,
      plan: "free",
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
      plan: "free",
      error: "無權限讀取履歷瀏覽紀錄。"
    };
  }

  const userPlan = await getUserPlan(userId);
  const { count, error: countError } = await supabase
    .from("profile_views")
    .select("*", { count: "exact", head: true })
    .eq("target_user_id", userId);

  if (countError) {
    return {
      totalCount: 0,
      views: [],
      isLocked: false,
      plan: userPlan.plan,
      error: countError.message
    };
  }

  let viewsQuery = supabase
    .from("profile_views")
    .select("*")
    .eq("target_user_id", userId)
    .order("viewed_at", { ascending: false });

  if (!userPlan.isPro) {
    viewsQuery = viewsQuery.limit(1);
  }

  const { data: views, error: viewsError } = await viewsQuery;

  if (viewsError) {
    return {
      totalCount: count ?? 0,
      views: [],
      isLocked: !userPlan.isPro && (count ?? 0) > 0,
      plan: userPlan.plan,
      error: viewsError.message
    };
  }

  const visibleViews = (views ?? []) as ProfileView[];
  const totalCount = count ?? 0;

  return {
    totalCount,
    views: visibleViews,
    isLocked: !userPlan.isPro && totalCount > visibleViews.length,
    plan: userPlan.plan
  };
}
