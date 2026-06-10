"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getEmployerWorkspaceContext, getWorkspaceErrorMessage } from "@/lib/employer-workspace";
import { createResendClient, getEmailFrom } from "@/lib/resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InviteActionResult = {
  ok: boolean;
  message: string;
  token?: string;
  expiresAt?: string;
  emailSent?: boolean;
};

function normalizeEmail(value: FormDataEntryValue | null) {
  const email = value?.toString().trim().toLowerCase() ?? "";
  return email.length > 0 ? email : null;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildInviteUrl(token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/invite?token=${encodeURIComponent(token)}`;
}

function buildInviteEmailHtml({
  companyName,
  inviteUrl
}: {
  companyName: string;
  inviteUrl: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.7;">
      <h1 style="font-size: 22px;">加入 ${companyName} 的 NOMAD-GO 招募團隊</h1>
      <p>你已被邀請加入 ${companyName} 的企業 workspace，一起管理職缺、應徵者與候選人訊息。</p>
      <p>
        <a href="${inviteUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: 700;">
          接受團隊邀請
        </a>
      </p>
      <p style="color: #4b5563;">此邀請連結 7 天內有效。如果你沒有預期收到這封信，可以忽略此郵件。</p>
    </div>
  `;
}

async function sendCompanyInviteEmail({
  companyName,
  email,
  token
}: {
  companyName: string;
  email: string;
  token: string;
}) {
  const resend = createResendClient();

  if (!resend) {
    return {
      sent: false,
      message: "邀請票券已建立；尚未設定 RESEND_API_KEY，請手動分享邀請連結。"
    };
  }

  const inviteUrl = buildInviteUrl(token);

  try {
    await resend.emails.send({
      from: getEmailFrom(),
      to: email,
      subject: `${companyName} 邀請你加入 NOMAD-GO 招募團隊`,
      html: buildInviteEmailHtml({ companyName, inviteUrl })
    });

    return {
      sent: true,
      message: "邀請 Email 已發送。"
    };
  } catch (error) {
    console.error("[employer-team] Failed to send company invite email.", error);

    return {
      sent: false,
      message: "邀請票券已建立，但 Email 寄送失敗；請先手動分享邀請連結。"
    };
  }
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

    revalidatePath("/employer/team");

    if (email) {
      const emailResult = await sendCompanyInviteEmail({
        companyName: workspace.context.company.name,
        email,
        token
      });

      return {
        ok: true,
        message: emailResult.message,
        token,
        expiresAt,
        emailSent: emailResult.sent
      };
    }

    return {
      ok: true,
      message: "邀請連結已產生。",
      token,
      expiresAt,
      emailSent: false
    };
  } catch (error) {
    console.error("[employer-team] Failed to create company invite.", error);

    return {
      ok: false,
      message: "邀請建立失敗，請稍後再試。"
    };
  }
}
