"use server";

import { revalidatePath } from "next/cache";
import { getUserPlan } from "@/lib/subscription";
import { createResendClient, getEmailFrom } from "@/lib/resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CreateApplicationRpcRow,
  DirectConnectRpcRow,
  ScreeningAnswer
} from "@/lib/types";

type CreateApplicationPayload = {
  resumeUrl: string;
  coverLetter?: string | null;
  screeningAnswers?: ScreeningAnswer[];
};

type HiringActionResult = {
  ok: true;
  applicationId: string;
  message: string;
  redirectTo?: string;
  remainingTokens?: number;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return "發生未知錯誤，請稍後再試。";
}

function normalizeHiringError(message: string) {
  if (message.includes("direct_connect_tokens_exhausted")) {
    return "免費私訊額度已用盡，請升級 Pro 後再使用 Direct Connect。";
  }

  if (message.includes("duplicate key") || message.includes("23505")) {
    return "你已投遞過此職缺。";
  }

  if (message.includes("job_not_found")) {
    return "職缺已下架或不存在。";
  }

  if (message.includes("profile_not_found")) {
    return "找不到你的會員資料，請先完成個人檔案。";
  }

  if (message.includes("cannot_direct_connect_self")) {
    return "無法對自己發佈的職缺使用 Direct Connect。";
  }

  if (message.includes("not_authenticated")) {
    return "請先登入後再操作。";
  }

  return message;
}

async function getCurrentUserOrThrow(expectedUserId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    throw new Error("尚未設定 Supabase 環境變數。");
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("請先登入後再操作。");
  }

  if (user.id !== expectedUserId) {
    throw new Error("登入狀態與操作對象不一致，請重新登入後再試。");
  }

  return { supabase, user };
}

async function sendEmployerEmail({
  html,
  subject,
  supabaseAdmin,
  targetUserId
}: {
  html: string;
  subject: string;
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
  targetUserId: string;
}) {
  const resend = createResendClient();

  if (!resend) {
    return;
  }

  const {
    data: { user }
  } = await supabaseAdmin.auth.admin.getUserById(targetUserId);

  if (!user?.email) {
    return;
  }

  try {
    await resend.emails.send({
      from: getEmailFrom(),
      to: user.email,
      subject,
      html
    });
  } catch (error) {
    console.error("[hiring] Failed to send hiring email.", error);
  }
}

async function getPublishedJobOwner(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  jobId: string
) {
  const { data: job, error } = await supabaseAdmin
    .from("jobs")
    .select("id,title,company,company_name,employer_id,company_id,status")
    .eq("id", jobId)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!job) {
    throw new Error("職缺已下架或不存在。");
  }

  let ownerId = job.employer_id;
  let companyName = job.company_name ?? job.company ?? "企業雇主";

  if (job.company_id) {
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id,name,employer_id")
      .eq("id", job.company_id)
      .maybeSingle();

    if (companyError) {
      throw new Error(companyError.message);
    }

    ownerId = company?.employer_id ?? ownerId;
    companyName = company?.name ?? companyName;
  }

  if (!ownerId) {
    throw new Error("找不到此職缺的企業負責人。");
  }

  return {
    companyName,
    job,
    ownerId
  };
}

export async function createApplication(
  jobId: string,
  userId: string,
  payload?: CreateApplicationPayload
): Promise<HiringActionResult> {
  if (!jobId || !userId) {
    throw new Error("缺少職缺或使用者資料。");
  }

  if (!payload?.resumeUrl) {
    throw new Error("請先上傳 PDF 履歷。");
  }

  const { supabase } = await getCurrentUserOrThrow(userId);
  const supabaseAdmin = createSupabaseAdminClient();
  const screeningAnswers = payload.screeningAnswers ?? [];
  const { data, error: applicationError } = await supabase.rpc(
    "create_application_with_notification",
    {
      target_job_id: jobId,
      target_user_id: userId,
      target_resume_url: payload.resumeUrl,
      target_cover_letter: payload.coverLetter?.trim() || null,
      target_screening_answers: screeningAnswers
    }
  );

  if (applicationError) {
    throw new Error(normalizeHiringError(getErrorMessage(applicationError)));
  }

  const application = ((data ?? []) as CreateApplicationRpcRow[])[0];

  if (!application) {
    throw new Error("應徵建立失敗，請稍後再試。");
  }

  if (supabaseAdmin) {
    await sendEmployerEmail({
      supabaseAdmin,
      targetUserId: application.owner_id,
      subject: "NOMAD-GO 收到新的職缺投遞",
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.7;">
          <h1 style="font-size: 20px;">收到新的職缺投遞</h1>
          <p>有候選人投遞了 <strong>${application.job_title}</strong>。</p>
          <p>請回到 NOMAD-GO 企業後台查看履歷與篩選回答。</p>
        </div>
      `
    });
  }

  revalidatePath("/employer/applicants");
  revalidatePath("/dashboard/nomad/applications");

  return {
    ok: true,
    applicationId: application.application_id,
    message: "應徵已送出，企業將在後台審閱你的履歷。"
  };
}

export async function executeDirectConnect(
  jobId: string,
  userId: string
): Promise<HiringActionResult> {
  if (!jobId || !userId) {
    throw new Error("缺少職缺或使用者資料。");
  }

  const { supabase } = await getCurrentUserOrThrow(userId);
  const supabaseAdmin = createSupabaseAdminClient();
  const userPlan = await getUserPlan(userId);

  if (!userPlan.isPro) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("direct_connect_tokens")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if ((profile?.direct_connect_tokens ?? 0) <= 0) {
      throw new Error("免費私訊額度已用盡，請升級 Pro 後再使用 Direct Connect。");
    }
  }

  const { data, error } = await supabase.rpc("execute_direct_connect", {
    target_job_id: jobId,
    target_user_id: userId,
    message_content: "你好，我對這個職缺很感興趣，想主動與 Hiring Manager 聯繫。"
  });

  if (error) {
    throw new Error(normalizeHiringError(getErrorMessage(error)));
  }

  const row = ((data ?? []) as DirectConnectRpcRow[])[0];

  if (!row) {
    throw new Error("Direct Connect 執行失敗，請稍後再試。");
  }

  if (supabaseAdmin) {
    const { job, ownerId } = await getPublishedJobOwner(supabaseAdmin, jobId);

    await sendEmployerEmail({
      supabaseAdmin,
      targetUserId: ownerId,
      subject: "NOMAD-GO 收到新的 Direct Connect 私訊",
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.7;">
          <h1 style="font-size: 20px;">收到新的 Direct Connect 私訊</h1>
          <p>有候選人針對 <strong>${job.title}</strong> 主動聯繫 Hiring Manager。</p>
          <p>請回到 NOMAD-GO 企業訊息中心回覆。</p>
        </div>
      `
    });
  }

  revalidatePath("/employer/messages");
  revalidatePath("/dashboard/nomad/applications");
  revalidatePath("/dashboard/nomad/applications/messages");

  return {
    ok: true,
    applicationId: row.application_id,
    message: "Direct Connect 已送出。",
    redirectTo: `/dashboard/nomad/applications/messages?application_id=${encodeURIComponent(row.application_id)}`,
    remainingTokens: row.remaining_tokens
  };
}
