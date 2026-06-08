"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type JobStatus = "draft" | "pending" | "published" | "closed";

const validJobStatuses = new Set<JobStatus>([
  "draft",
  "pending",
  "published",
  "closed"
]);

type SupabaseClient = NonNullable<
  Awaited<ReturnType<typeof createSupabaseServerClient>>
>;

type AuthenticatedEmployerContext = {
  supabase: SupabaseClient;
  userId: string;
};

function readText(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function readOptionalText(value: FormDataEntryValue | null) {
  const text = readText(value);
  return text.length > 0 ? text : null;
}

function readOptionalNumber(value: FormDataEntryValue | null) {
  const text = readText(value);
  if (!text) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function encodeError(message: string) {
  return encodeURIComponent(message);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "操作失敗，請稍後再試。";
}

function getMissingColumnName(error: unknown) {
  const message = getErrorMessage(error);
  const quotedMatch = message.match(/Could not find the '([^']+)' column/);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const columnMatch = message.match(/column .*?\.([a-zA-Z0-9_]+) does not exist/);
  return columnMatch?.[1] ?? null;
}

async function getAuthenticatedEmployerContext(): Promise<AuthenticatedEmployerContext> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return {
    supabase,
    userId: user.id
  };
}

async function getEmployerCompanyId(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  const profileRecord = (profile ?? {}) as Record<string, unknown>;
  if (typeof profileRecord.company_id === "string") {
    return profileRecord.company_id;
  }

  const ownerColumns = ["owner_id", "user_id", "employer_id", "created_by"];
  for (const column of ownerColumns) {
    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .eq(column, userId)
      .limit(1)
      .maybeSingle();

    if (!error && data && typeof (data as { id?: unknown }).id === "string") {
      return (data as { id: string }).id;
    }
  }

  return null;
}

function buildJobPayload(
  formData: FormData,
  userId: string,
  status: JobStatus,
  companyId: string | null
) {
  const title = readText(formData.get("title"));
  const description = readText(formData.get("description"));
  const jobType = readOptionalText(formData.get("job_type"));
  const workType = readOptionalText(formData.get("work_type"));
  const location = readOptionalText(formData.get("location"));
  const requirements = readOptionalText(formData.get("requirements"));
  const benefits = readOptionalText(formData.get("benefits"));
  const salaryMin = readOptionalNumber(formData.get("salary_min"));
  const salaryMax = readOptionalNumber(formData.get("salary_max"));
  const salaryCurrency = readOptionalText(formData.get("salary_currency")) ?? "TWD";

  if (!title) {
    throw new Error("請輸入職缺名稱。");
  }

  if (!description) {
    throw new Error("請輸入職缺描述。");
  }

  const payload: Record<string, unknown> = {
    title,
    description,
    job_type: jobType,
    work_type: workType,
    location,
    requirements,
    benefits,
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_currency: salaryCurrency,
    status,
    employer_id: userId,
    created_by: userId,
    updated_at: new Date().toISOString()
  };

  if (companyId) {
    payload.company_id = companyId;
  }

  return payload;
}

async function insertJobWithColumnFallback(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
) {
  const cleanPayload = { ...payload };

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const { error } = await supabase.from("jobs").insert(cleanPayload as never);

    if (!error) {
      return;
    }

    const missingColumn = getMissingColumnName(error);
    if (missingColumn && missingColumn in cleanPayload) {
      delete cleanPayload[missingColumn];
      continue;
    }

    throw new Error(`建立職缺失敗：${error.message}`);
  }

  throw new Error("建立職缺失敗：欄位相容性重試次數已達上限。");
}

async function updateJobWithColumnFallback(
  supabase: SupabaseClient,
  jobId: string,
  payload: Record<string, unknown>
) {
  const cleanPayload = { ...payload };

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const { data, error } = await supabase
      .from("jobs")
      .update(cleanPayload as never)
      .eq("id", jobId)
      .select("id")
      .maybeSingle();

    if (!error) {
      if (!data) {
        throw new Error("找不到可更新的職缺，或你沒有權限修改此職缺。");
      }
      return;
    }

    const missingColumn = getMissingColumnName(error);
    if (missingColumn && missingColumn in cleanPayload) {
      delete cleanPayload[missingColumn];
      continue;
    }

    throw new Error(`更新職缺失敗：${error.message}`);
  }

  throw new Error("更新職缺失敗：欄位相容性重試次數已達上限。");
}

export async function createEmployerJob(formData: FormData) {
  let redirectUrl = "/dashboard/employer/jobs?created=1";

  try {
    const { supabase, userId } = await getAuthenticatedEmployerContext();
    const companyId = await getEmployerCompanyId(supabase, userId);
    const payload = buildJobPayload(formData, userId, "pending", companyId);

    await insertJobWithColumnFallback(supabase, payload);

    revalidatePath("/dashboard/employer/jobs");
  } catch (error) {
    redirectUrl = `/dashboard/employer/jobs/create?error=${encodeError(
      getErrorMessage(error)
    )}`;
  }

  redirect(redirectUrl);
}

export async function updateEmployerJob(jobId: string, formData: FormData) {
  let redirectUrl = "/dashboard/employer/jobs?updated=1";

  try {
    if (!jobId) {
      throw new Error("缺少職缺 ID。");
    }

    const { supabase, userId } = await getAuthenticatedEmployerContext();
    const companyId = await getEmployerCompanyId(supabase, userId);
    const requestedStatus = readOptionalText(formData.get("status"));
    const status = validJobStatuses.has(requestedStatus as JobStatus)
      ? (requestedStatus as JobStatus)
      : "pending";
    const payload = buildJobPayload(formData, userId, status, companyId);
    delete payload.employer_id;
    delete payload.created_by;
    delete payload.company_id;

    await updateJobWithColumnFallback(supabase, jobId, payload);

    revalidatePath("/dashboard/employer/jobs");
    revalidatePath(`/dashboard/employer/jobs/${jobId}/edit`);
  } catch (error) {
    redirectUrl = `/dashboard/employer/jobs/${jobId}/edit?error=${encodeError(
      getErrorMessage(error)
    )}`;
  }

  redirect(redirectUrl);
}

export async function toggleJobStatus(jobId: string, newStatus: JobStatus) {
  if (!validJobStatuses.has(newStatus)) {
    redirect(
      `/dashboard/employer/jobs?error=${encodeError("不支援的職缺狀態。")}`
    );
  }

  let redirectUrl = "/dashboard/employer/jobs?status-updated=1";

  try {
    const { supabase } = await getAuthenticatedEmployerContext();
    const { data, error } = await supabase
      .from("jobs")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      } as never)
      .eq("id", jobId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(`狀態更新失敗：${error.message}`);
    }

    if (!data) {
      throw new Error("找不到可更新的職缺，或你沒有權限修改此職缺。");
    }

    revalidatePath("/dashboard/employer/jobs");
  } catch (error) {
    redirectUrl = `/dashboard/employer/jobs?error=${encodeError(
      getErrorMessage(error)
    )}`;
  }

  redirect(redirectUrl);
}

export async function deleteJob(jobId: string) {
  let redirectUrl = "/dashboard/employer/jobs?deleted=1";

  try {
    const { supabase } = await getAuthenticatedEmployerContext();
    const { data, error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", jobId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(`刪除職缺失敗：${error.message}`);
    }

    if (!data) {
      throw new Error("找不到可刪除的職缺，或你沒有權限刪除此職缺。");
    }

    revalidatePath("/dashboard/employer/jobs");
  } catch (error) {
    redirectUrl = `/dashboard/employer/jobs?error=${encodeError(
      getErrorMessage(error)
    )}`;
  }

  redirect(redirectUrl);
}
