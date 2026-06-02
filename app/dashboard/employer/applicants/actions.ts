"use server";

import { revalidatePath } from "next/cache";
import { getEmployerWorkspaceContext, getWorkspaceErrorMessage } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ApplicationStatus,
  CompanySubscriptionPlan,
  EmployerApplicantUnlockRpcRow
} from "@/lib/types";

type ActionResult = {
  ok: boolean;
  message: string;
};

export type UnlockApplicantReason =
  | "unlock_limit_reached"
  | "not_authenticated"
  | "not_found"
  | "invalid_payload"
  | "unknown";

export type UnlockApplicantResult = {
  ok: boolean;
  allowed: boolean;
  reason: UnlockApplicantReason | null;
  message: string;
  applicationId: string | null;
  applicantId: string | null;
  applicantEmail: string | null;
  unlockedCount: number;
  unlockLimit: number;
  resetDate: string | null;
  subscriptionPlan: CompanySubscriptionPlan;
  alreadyUnlocked: boolean;
  portfolioUrl: string | null;
  socialUrls: Record<string, string>;
};

const applicationStatuses: ApplicationStatus[] = [
  "pending",
  "reviewed",
  "interview",
  "rejected",
  "hired"
];

function isApplicationStatus(value: string | undefined): value is ApplicationStatus {
  return Boolean(value && applicationStatuses.includes(value as ApplicationStatus));
}

function normalizeUnlockReason(value: string | null | undefined): UnlockApplicantReason {
  if (
    value === "unlock_limit_reached" ||
    value === "not_authenticated" ||
    value === "not_found" ||
    value === "invalid_payload"
  ) {
    return value;
  }

  return "unknown";
}

function buildUnlockResult(params: Partial<UnlockApplicantResult> & Pick<UnlockApplicantResult, "ok" | "allowed" | "message">): UnlockApplicantResult {
  return {
    ok: params.ok,
    allowed: params.allowed,
    reason: params.reason ?? null,
    message: params.message,
    applicationId: params.applicationId ?? null,
    applicantId: params.applicantId ?? null,
    applicantEmail: params.applicantEmail ?? null,
    unlockedCount: params.unlockedCount ?? 0,
    unlockLimit: params.unlockLimit ?? 3,
    resetDate: params.resetDate ?? null,
    subscriptionPlan: params.subscriptionPlan ?? "free",
    alreadyUnlocked: params.alreadyUnlocked ?? false,
    portfolioUrl: params.portfolioUrl ?? null,
    socialUrls: params.socialUrls ?? {}
  };
}

export async function updateEmployerApplicationStatus(formData: FormData): Promise<ActionResult> {
  return updateEmployerApplicationReview(formData);
}

export async function updateEmployerApplicationReview(formData: FormData): Promise<ActionResult> {
  const applicationId = formData.get("application_id")?.toString();
  const nextStatus = formData.get("status")?.toString();
  const internalNotes = formData.get("internal_notes")?.toString().trim() || null;

  if (!applicationId || !isApplicationStatus(nextStatus)) {
    return {
      ok: false,
      message: "應徵狀態更新資料不完整。"
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      message: "尚未設定 Supabase 環境變數，無法更新應徵狀態。"
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
      message: "找不到可管理的公司 workspace。"
    };
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id, job_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError) {
    return {
      ok: false,
      message: getWorkspaceErrorMessage(applicationError)
    };
  }

  if (!application) {
    return {
      ok: false,
      message: "找不到此應徵紀錄，或你沒有讀取權限。"
    };
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, company_id, employer_id")
    .eq("id", application.job_id)
    .maybeSingle();

  if (jobError) {
    return {
      ok: false,
      message: getWorkspaceErrorMessage(jobError)
    };
  }

  const belongsToWorkspace =
    job?.company_id === workspace.context.company.id ||
    (workspace.context.isOwner && job?.employer_id === user.id);

  if (!belongsToWorkspace) {
    return {
      ok: false,
      message: "你沒有權限更新其他公司的應徵紀錄。"
    };
  }

  const { error } = await supabase
    .from("applications")
    .update({
      status: nextStatus,
      internal_notes: internalNotes
    })
    .eq("id", applicationId);

  if (error) {
    return {
      ok: false,
      message: getWorkspaceErrorMessage(error)
    };
  }

  revalidatePath("/dashboard/employer/applicants");

  return {
    ok: true,
    message: "應徵狀態已更新。"
  };
}

export async function unlockApplicant(formData: FormData): Promise<UnlockApplicantResult> {
  const applicationId = formData.get("application_id")?.toString();

  if (!applicationId) {
    return buildUnlockResult({
      ok: false,
      allowed: false,
      reason: "invalid_payload",
      message: "缺少應徵紀錄 ID。"
    });
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return buildUnlockResult({
      ok: false,
      allowed: false,
      reason: "unknown",
      message: "尚未設定 Supabase 環境變數，無法解鎖聯絡方式。"
    });
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return buildUnlockResult({
      ok: false,
      allowed: false,
      reason: "not_authenticated",
      message: "請先登入企業雇主中心。"
    });
  }

  const { data, error } = await supabase.rpc("unlock_company_applicant", {
    target_application_id: applicationId
  });

  if (error) {
    console.error("[employer-applicants] Failed to unlock applicant.", error);

    return buildUnlockResult({
      ok: false,
      allowed: false,
      reason: "unknown",
      message: getWorkspaceErrorMessage(error)
    });
  }

  const row = ((data ?? []) as EmployerApplicantUnlockRpcRow[])[0];

  if (!row) {
    return buildUnlockResult({
      ok: false,
      allowed: false,
      reason: "unknown",
      message: "目前無法解鎖此應徵者聯絡方式，請稍後再試。"
    });
  }

  const reason = row.allowed ? null : normalizeUnlockReason(row.reason);

  if (!row.allowed) {
    return buildUnlockResult({
      ok: false,
      allowed: false,
      reason,
      message:
        reason === "unlock_limit_reached"
          ? "免費解鎖額度已用盡，升級方案後即可繼續解鎖人才聯絡方式。"
          : "目前無法解鎖此應徵者聯絡方式。",
      applicationId: row.application_id,
      applicantId: row.applicant_id,
      unlockedCount: row.unlocked_count,
      unlockLimit: row.unlock_limit,
      resetDate: row.reset_date,
      subscriptionPlan: row.subscription_plan
    });
  }

  revalidatePath("/dashboard/employer/applicants");
  revalidatePath(`/dashboard/employer/applicants/${row.applicant_id}`);

  return buildUnlockResult({
    ok: true,
    allowed: true,
    reason: null,
    message: row.already_unlocked ? "此人才聯絡方式已解鎖。" : "已解鎖人才聯絡方式。",
    applicationId: row.application_id,
    applicantId: row.applicant_id,
    applicantEmail: row.applicant_email,
    unlockedCount: row.unlocked_count,
    unlockLimit: row.unlock_limit,
    resetDate: row.reset_date,
    subscriptionPlan: row.subscription_plan,
    alreadyUnlocked: row.already_unlocked,
    portfolioUrl: row.portfolio_url,
    socialUrls: row.social_urls
  });
}
