"use server";

import { revalidatePath } from "next/cache";
import { getEmployerWorkspaceContext, getWorkspaceErrorMessage } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types";

type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"];

export type EmployerJobQuotaReason =
  | "job_limit_reached"
  | "company_not_approved"
  | "not_authenticated"
  | "workspace_missing"
  | "invalid_payload"
  | "unknown";

export type EmployerJobQuotaResult = {
  ok: boolean;
  allowed: boolean;
  reason: EmployerJobQuotaReason | null;
  message: string;
  activeJobsCount: number;
  maxActiveJobs: number;
};

function normalizeOptional(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text.length > 0 ? text : null;
}

function normalizeRequired(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function normalizeTags(value: FormDataEntryValue | null) {
  return (
    value
      ?.toString()
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean) ?? []
  );
}

function normalizeScreeningQuestions(formData: FormData) {
  return formData
    .getAll("screening_questions")
    .map((value) => value.toString().trim())
    .filter(Boolean)
    .slice(0, 3);
}

function createDescription(formData: FormData) {
  const sections = [
    ["工作職責", normalizeRequired(formData.get("responsibilities"))],
    ["必備條件", normalizeRequired(formData.get("requirements"))],
    ["加分條件", normalizeRequired(formData.get("nice_to_haves"))],
    ["公司福利", normalizeRequired(formData.get("benefits"))]
  ];

  return sections
    .filter(([, value]) => value.length > 0)
    .map(([label, value]) => `## ${label}\n\n${value}`)
    .join("\n\n");
}

function getMaxActiveJobs(value: number | null | undefined) {
  return Math.max(1, typeof value === "number" && Number.isFinite(value) ? value : 1);
}

function buildResult(params: {
  ok: boolean;
  allowed: boolean;
  reason: EmployerJobQuotaReason | null;
  message: string;
  activeJobsCount?: number;
  maxActiveJobs?: number;
}): EmployerJobQuotaResult {
  return {
    ok: params.ok,
    allowed: params.allowed,
    reason: params.reason,
    message: params.message,
    activeJobsCount: params.activeJobsCount ?? 0,
    maxActiveJobs: params.maxActiveJobs ?? 1
  };
}

export async function publishJob(formData: FormData): Promise<EmployerJobQuotaResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return buildResult({
      ok: false,
      allowed: false,
      reason: "unknown",
      message: "尚未設定 Supabase 環境變數，無法發布職缺。"
    });
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return buildResult({
      ok: false,
      allowed: false,
      reason: "not_authenticated",
      message: "請先登入企業雇主中心。"
    });
  }

  const workspace = await getEmployerWorkspaceContext(supabase, user.id);

  if (workspace.error) {
    return buildResult({
      ok: false,
      allowed: false,
      reason: "workspace_missing",
      message: workspace.error
    });
  }

  if (!workspace.context?.company) {
    return buildResult({
      ok: false,
      allowed: false,
      reason: "workspace_missing",
      message: "請先建立公司品牌資料，再發布職缺。"
    });
  }

  const company = workspace.context.company;

  if (company.approval_status !== "approved") {
    return buildResult({
      ok: false,
      allowed: false,
      reason: "company_not_approved",
      message: "企業入駐審核通過後才能發布職缺。"
    });
  }

  const maxActiveJobs = getMaxActiveJobs(company.max_active_jobs);
  const { count: activeJobsCount, error: activeJobsError } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", company.id)
    .eq("status", "published");

  if (activeJobsError) {
    return buildResult({
      ok: false,
      allowed: false,
      reason: "unknown",
      message: getWorkspaceErrorMessage(activeJobsError),
      maxActiveJobs
    });
  }

  const currentActiveJobsCount = activeJobsCount ?? 0;
  const existingJobId = normalizeOptional(formData.get("job_id"));

  if (existingJobId) {
    const { data: currentJob, error: currentJobError } = await supabase
      .from("jobs")
      .select("id,status,company_id,employer_id")
      .eq("id", existingJobId)
      .maybeSingle();

    if (currentJobError || !currentJob) {
      return buildResult({
        ok: false,
        allowed: false,
        reason: "invalid_payload",
        message: currentJobError ? getWorkspaceErrorMessage(currentJobError) : "找不到要上架的職缺。",
        activeJobsCount: currentActiveJobsCount,
        maxActiveJobs
      });
    }

    const belongsToWorkspace =
      currentJob.company_id === company.id ||
      (workspace.context.isOwner && currentJob.employer_id === user.id);

    if (!belongsToWorkspace) {
      return buildResult({
        ok: false,
        allowed: false,
        reason: "workspace_missing",
        message: "你沒有權限發布其他公司的職缺。",
        activeJobsCount: currentActiveJobsCount,
        maxActiveJobs
      });
    }

    if (currentJob.status !== "published" && currentActiveJobsCount >= maxActiveJobs) {
      return buildResult({
        ok: false,
        allowed: false,
        reason: "job_limit_reached",
        message: "職缺上架額度已滿，請升級方案後再發布更多職缺。",
        activeJobsCount: currentActiveJobsCount,
        maxActiveJobs
      });
    }

    const { error } = await supabase
      .from("jobs")
      .update({ status: "published", rejection_reason: null })
      .eq("id", existingJobId);

    if (error) {
      return buildResult({
        ok: false,
        allowed: false,
        reason: "unknown",
        message: getWorkspaceErrorMessage(error),
        activeJobsCount: currentActiveJobsCount,
        maxActiveJobs
      });
    }

    revalidatePath("/dashboard/employer/jobs");
    revalidatePath("/jobs");

    return buildResult({
      ok: true,
      allowed: true,
      reason: null,
      message: "職缺已上架。",
      activeJobsCount: currentActiveJobsCount + (currentJob.status === "published" ? 0 : 1),
      maxActiveJobs
    });
  }

  if (currentActiveJobsCount >= maxActiveJobs) {
    return buildResult({
      ok: false,
      allowed: false,
      reason: "job_limit_reached",
      message: "職缺上架額度已滿，請升級方案後再新增職缺。",
      activeJobsCount: currentActiveJobsCount,
      maxActiveJobs
    });
  }

  const title = normalizeRequired(formData.get("title"));
  const location = normalizeRequired(formData.get("location"));
  const responsibilities = normalizeRequired(formData.get("responsibilities"));
  const requirements = normalizeRequired(formData.get("requirements"));

  if (!title || !location || !responsibilities || !requirements) {
    return buildResult({
      ok: false,
      allowed: true,
      reason: "invalid_payload",
      message: "請填寫職缺名稱、地點、工作職責與必備條件。",
      activeJobsCount: currentActiveJobsCount,
      maxActiveJobs
    });
  }

  const employmentType = normalizeRequired(formData.get("employment_type")) || "全職 (Full-time)";
  const insertPayload: JobInsert = {
    employer_id: company.employer_id,
    company_id: company.id,
    title,
    company: normalizeRequired(formData.get("company")) || company.name || "未命名公司",
    location,
    job_type: employmentType,
    category: normalizeRequired(formData.get("category")) || "其他 (Other)",
    experience_level: normalizeRequired(formData.get("experience_level")) || "中階 (Mid-Level)",
    employment_type: employmentType,
    salary_range: normalizeOptional(formData.get("salary_range")),
    tags: normalizeTags(formData.get("tags")),
    description: createDescription(formData),
    responsibilities,
    requirements,
    nice_to_haves: normalizeRequired(formData.get("nice_to_haves")),
    benefits: normalizeRequired(formData.get("benefits")),
    screening_questions: normalizeScreeningQuestions(formData),
    apply_url: null,
    is_featured: false,
    rejection_reason: null,
    status: "pending"
  };

  const { error } = await supabase.from("jobs").insert(insertPayload);

  if (error) {
    return buildResult({
      ok: false,
      allowed: true,
      reason: "unknown",
      message: getWorkspaceErrorMessage(error),
      activeJobsCount: currentActiveJobsCount,
      maxActiveJobs
    });
  }

  revalidatePath("/dashboard/employer/jobs");

  return buildResult({
    ok: true,
    allowed: true,
    reason: null,
    message: "職缺已送出審核。",
    activeJobsCount: currentActiveJobsCount,
    maxActiveJobs
  });
}
