"use server";

import { getEmployerWorkspaceContext } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompanySubscriptionPlan } from "@/lib/types";

export type EmployerDashboardStats = {
  activeJobsCount: number;
  totalApplicants: number;
  unreadMessages: number;
  plan: CompanySubscriptionPlan;
};

export async function getEmployerDashboardStats(): Promise<{
  stats: EmployerDashboardStats | null;
  error: string | null;
}> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      stats: null,
      error: "尚未設定 Supabase 環境變數，無法讀取企業統計。"
    };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      stats: null,
      error: "請先登入企業雇主中心。"
    };
  }

  const workspace = await getEmployerWorkspaceContext(supabase, user.id);

  if (workspace.error) {
    return {
      stats: null,
      error: workspace.error
    };
  }

  if (!workspace.context?.company) {
    return {
      stats: null,
      error: "請先建立企業 Workspace。"
    };
  }

  const company = workspace.context.company;
  const jobFilters = [
    `company_id.eq.${company.id}`,
    `employer_id.eq.${company.employer_id}`
  ].join(",");

  const { count: activeJobsCount, error: activeJobsError } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .or(jobFilters)
    .eq("status", "published");

  if (activeJobsError) {
    return {
      stats: null,
      error: activeJobsError.message
    };
  }

  const { data: jobRows, error: jobsError } = await supabase
    .from("jobs")
    .select("id")
    .or(jobFilters);

  if (jobsError) {
    return {
      stats: null,
      error: jobsError.message
    };
  }

  const jobIds = (jobRows ?? []).map((job) => job.id);
  let totalApplicants = 0;
  let unreadMessages = 0;

  if (jobIds.length > 0) {
    const { count: applicantsCount, error: applicantsError } = await supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .in("job_id", jobIds);

    if (applicantsError) {
      return {
        stats: null,
        error: applicantsError.message
      };
    }

    totalApplicants = applicantsCount ?? 0;

    const { data: applicationRows, error: applicationsError } = await supabase
      .from("applications")
      .select("id")
      .in("job_id", jobIds);

    if (applicationsError) {
      return {
        stats: null,
        error: applicationsError.message
      };
    }

    const applicationIds = (applicationRows ?? []).map((application) => application.id);

    if (applicationIds.length > 0) {
      const { count: unreadCount, error: unreadError } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("application_id", applicationIds)
        .eq("is_read", false)
        .neq("sender_id", user.id);

      if (unreadError) {
        return {
          stats: null,
          error: unreadError.message
        };
      }

      unreadMessages = unreadCount ?? 0;
    }
  }

  return {
    stats: {
      activeJobsCount: activeJobsCount ?? 0,
      totalApplicants,
      unreadMessages,
      plan: company.subscription_plan ?? "free"
    },
    error: null
  };
}
