"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getEmployerWorkspaceContext, getWorkspaceErrorMessage } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InviteActionResult = {
  ok: boolean;
  message: string;
  token?: string;
  expiresAt?: string;
};

function normalizeEmail(value: FormDataEntryValue | null) {
  const email = value?.toString().trim().toLowerCase() ?? "";
  return email.length > 0 ? email : null;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createCompanyInvite(formData: FormData): Promise<InviteActionResult> {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return {
        ok: false,
        message: "尚未設定 Supabase 環境變數，無法建立邀請。"
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
        message: "請先建立公司品牌資料，再邀請團隊成員。"
      };
    }

    if (!workspace.context.canManageTeam) {
      return {
        ok: false,
        message: "只有公司 Admin 可以邀請新成員。"
      };
    }

    const email = normalizeEmail(formData.get("email"));

    if (email && !isValidEmail(email)) {
      return {
        ok: false,
        message: "請輸入有效的 Email。"
      };
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("company_invites").insert({
      company_id: workspace.context.company.id,
      token,
      email,
      status: "pending",
      expires_at: expiresAt,
      created_by: user.id
    });

    if (error) {
      return {
        ok: false,
        message: getWorkspaceErrorMessage(error)
      };
    }

    revalidatePath("/dashboard/employer/team");

    return {
      ok: true,
      message: email ? "邀請已發送。" : "邀請連結已產生。",
      token,
      expiresAt
    };
  } catch (error) {
    console.error("[employer-team] Failed to create company invite.", error);

    return {
      ok: false,
      message: "邀請建立失敗，請稍後再試。"
    };
  }
}
