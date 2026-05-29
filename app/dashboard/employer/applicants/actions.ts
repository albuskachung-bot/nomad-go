"use server";

import { revalidatePath } from "next/cache";
import { getEmployerWorkspaceContext, getWorkspaceErrorMessage } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/lib/types";

type ActionResult = {
  ok: boolean;
  message: string;
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
