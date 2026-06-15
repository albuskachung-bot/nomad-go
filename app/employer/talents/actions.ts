"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getEmployerWorkspaceContext,
  getWorkspaceErrorMessage
} from "@/lib/employer-workspace";

export type TriggerProfileViewResult = {
  ok: boolean;
  error: string | null;
  redirectTo?: string;
};

export async function triggerProfileView(targetUserId: string): Promise<TriggerProfileViewResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      error: "尚未設定 Supabase 環境變數，無法紀錄履歷瀏覽。"
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "請先登入企業雇主中心。"
    };
  }

  if (!targetUserId) {
    return {
      ok: false,
      error: "缺少人才履歷 ID。"
    };
  }

  const workspace = await getEmployerWorkspaceContext(supabase, user.id);

  if (workspace.error) {
    return {
      ok: false,
      error: workspace.error
    };
  }

  if (!workspace.context) {
    return {
      ok: false,
      error: "請先完成企業 Workspace 設定後再查看完整履歷。"
    };
  }

  const company = workspace.context.company;
  const planType = company.subscription_plan ?? "free";

  if (planType !== "pro") {
    return {
      ok: false,
      error: "此功能僅開放企業 Pro 方案使用，請先升級後再查看完整履歷。"
    };
  }

  const { error } = await supabase.from("profile_views").insert({
    viewer_company_id: company.id,
    viewer_company_name: company.name,
    target_user_id: targetUserId
  });

  if (error) {
    return {
      ok: false,
      error: getWorkspaceErrorMessage(error)
    };
  }

  const notificationContent = `${company.name || "企業雇主"} 查看了你的完整履歷`;
  const notificationClient = createSupabaseAdminClient() ?? supabase;
  const { error: notificationError } = await notificationClient
    .from("notifications")
    .insert({
      user_id: targetUserId,
      type: "profile_view",
      title: "你的履歷被企業查看",
      message: notificationContent,
      content: notificationContent,
      link_url: "/dashboard/nomad",
      metadata: {
        company_id: company.id,
        company_name: company.name
      },
      is_read: false
    });

  if (notificationError) {
    return {
      ok: false,
      error: getWorkspaceErrorMessage(notificationError)
    };
  }

  revalidatePath("/dashboard/nomad");
  revalidatePath("/dashboard/nomad/applications/messages");

  return {
    ok: true,
    error: null,
    redirectTo: `/employer/talents/${targetUserId}`
  };
}
