"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEmployerWorkspaceContext, getWorkspaceErrorMessage } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompanyApplicationWithNotes } from "@/lib/types";

function readText(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function redirectWithEmployerMessageError(applicationId: string, message: string): never {
  const params = new URLSearchParams();

  if (applicationId) {
    params.set("application_id", applicationId);
  }

  params.set("error", message);
  redirect(`/dashboard/employer/messages?${params.toString()}`);
}

export async function sendEmployerMessage(formData: FormData) {
  const applicationId = readText(formData.get("application_id"));
  const content = readText(formData.get("content"));

  if (!applicationId || !content) {
    redirectWithEmployerMessageError(applicationId, "請輸入訊息內容。");
  }

  if (content.length > 4000) {
    redirectWithEmployerMessageError(applicationId, "訊息內容不可超過 4000 字。");
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithEmployerMessageError(applicationId, "尚未設定 Supabase 環境變數，無法送出訊息。");
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirectWithEmployerMessageError(applicationId, "請先登入企業雇主中心。");
  }

  const workspace = await getEmployerWorkspaceContext(supabase, user.id);

  if (workspace.error) {
    redirectWithEmployerMessageError(applicationId, workspace.error);
  }

  if (!workspace.context?.company) {
    redirectWithEmployerMessageError(applicationId, "找不到可管理的公司 workspace。");
  }

  const { data: applications, error: applicationsError } = await supabase.rpc(
    "get_company_applications_with_notes",
    {
      target_company_id: workspace.context.company.id
    }
  );

  if (applicationsError) {
    redirectWithEmployerMessageError(applicationId, getWorkspaceErrorMessage(applicationsError));
  }

  const allowedApplication = ((applications ?? []) as CompanyApplicationWithNotes[]).find(
    (application) => application.id === applicationId
  );

  if (!allowedApplication) {
    redirectWithEmployerMessageError(applicationId, "你沒有權限聯絡此應徵者。");
  }

  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("application_id", applicationId)
    .neq("sender_id", user.id);

  const { error } = await supabase.from("messages").insert({
    application_id: applicationId,
    sender_id: user.id,
    content
  });

  if (error) {
    redirectWithEmployerMessageError(applicationId, getWorkspaceErrorMessage(error));
  }

  revalidatePath("/dashboard/employer/messages");
  revalidatePath("/dashboard/applications/messages");
  redirect(`/dashboard/employer/messages?application_id=${encodeURIComponent(applicationId)}`);
}
