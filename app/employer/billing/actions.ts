"use server";

import { revalidatePath } from "next/cache";
import { getEmployerWorkspaceContext } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompanySubscriptionPlan } from "@/lib/types";

type PlanRequestResult = {
  ok: boolean;
  message: string;
};

const subscriptionPlans: CompanySubscriptionPlan[] = ["free", "pro", "boost"];

const planLabels: Record<CompanySubscriptionPlan, string> = {
  free: "Free",
  pro: "Pro",
  boost: "Boost"
};

function isSubscriptionPlan(value: string): value is CompanySubscriptionPlan {
  return subscriptionPlans.includes(value as CompanySubscriptionPlan);
}

export async function requestEmployerPlanChange(
  nextPlan: CompanySubscriptionPlan
): Promise<PlanRequestResult> {
  if (!isSubscriptionPlan(nextPlan)) {
    return {
      ok: false,
      message: "方案資料不正確。"
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      message: "尚未設定 Supabase 環境變數，無法送出方案需求。"
    };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      message: "請先登入企業雇主中心。"
    };
  }

  const workspace = await getEmployerWorkspaceContext(supabase, user.id);

  if (workspace.error) {
    return {
      ok: false,
      message: workspace.error
    };
  }

  if (!workspace.context?.company) {
    return {
      ok: false,
      message: "請先建立公司品牌資料，再選擇企業方案。"
    };
  }

  const currentPlan = workspace.context.company.subscription_plan ?? "free";

  if (currentPlan === nextPlan) {
    return {
      ok: true,
      message: `目前已是 ${planLabels[nextPlan]} 方案。`
    };
  }

  revalidatePath("/employer/billing");

  return {
    ok: true,
    message: `已收到 ${planLabels[nextPlan]} 方案需求。金流串接完成前，平台團隊會協助您完成後續流程。`
  };
}
