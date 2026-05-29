"use server";

import { revalidatePath } from "next/cache";
import { getWorkspaceErrorMessage } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = {
  ok: boolean;
  message: string;
};

export async function acceptCompanyInvite(formData: FormData): Promise<ActionResult> {
  const token = formData.get("token")?.toString().trim();

  if (!token) {
    return {
      ok: false,
      message: "缺少邀請 token。"
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      message: "尚未設定 Supabase 環境變數，無法接受邀請。"
    };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      message: "請先登入或註冊後再接受邀請。"
    };
  }

  const { error } = await supabase.rpc("accept_company_invite", {
    target_token: token
  });

  if (error) {
    return {
      ok: false,
      message: getWorkspaceErrorMessage(error)
    };
  }

  revalidatePath("/dashboard/employer");
  revalidatePath("/dashboard/employer/team");

  return {
    ok: true,
    message: "已加入企業團隊。"
  };
}
