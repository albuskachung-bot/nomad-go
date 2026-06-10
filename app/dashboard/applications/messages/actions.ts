"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getWorkspaceErrorMessage } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function readText(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function redirectWithApplicantMessageError(applicationId: string, message: string): never {
  const params = new URLSearchParams();

  if (applicationId) {
    params.set("application_id", applicationId);
  }

  params.set("error", message);
  redirect(`/dashboard/applications/messages?${params.toString()}`);
}

export async function sendApplicantMessage(formData: FormData) {
  const applicationId = readText(formData.get("application_id"));
  const content = readText(formData.get("content"));

  if (!applicationId || !content) {
    redirectWithApplicantMessageError(applicationId, "請輸入訊息內容。");
  }

  if (content.length > 4000) {
    redirectWithApplicantMessageError(applicationId, "訊息內容不可超過 4000 字。");
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithApplicantMessageError(applicationId, "尚未設定 Supabase 環境變數，無法送出訊息。");
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirectWithApplicantMessageError(applicationId, "請先登入會員中心。");
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id,user_id")
    .eq("id", applicationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (applicationError) {
    redirectWithApplicantMessageError(applicationId, getWorkspaceErrorMessage(applicationError));
  }

  if (!application) {
    redirectWithApplicantMessageError(applicationId, "你沒有權限在此應徵紀錄送出訊息。");
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
    redirectWithApplicantMessageError(applicationId, getWorkspaceErrorMessage(error));
  }

  revalidatePath("/dashboard/applications/messages");
  revalidatePath("/employer/messages");
  redirect(`/dashboard/applications/messages?application_id=${encodeURIComponent(applicationId)}`);
}
