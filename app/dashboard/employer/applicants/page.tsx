"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, FileText, Loader2, UserRound, XCircle } from "lucide-react";
import { updateEmployerApplicationStatus } from "@/app/dashboard/employer/applicants/actions";
import { getEmployerWorkspaceContext } from "@/lib/employer-workspace";
import { supabase } from "@/lib/supabase/client";
import type { Application, ApplicationStatus, Job, Profile } from "@/lib/types";

type ApplicantRow = {
  application: Application;
  job: Job;
  profile: Profile | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const applicationStatuses: Array<{
  value: ApplicationStatus;
  label: string;
  className: string;
}> = [
  {
    value: "pending",
    label: "待審查",
    className: "bg-slate-100 text-slate-700 ring-slate-200"
  },
  {
    value: "reviewed",
    label: "已審閱",
    className: "bg-blue-50 text-blue-700 ring-blue-100"
  },
  {
    value: "interview",
    label: "面試中",
    className: "bg-amber-50 text-amber-700 ring-amber-100"
  },
  {
    value: "rejected",
    label: "婉拒",
    className: "bg-rose-50 text-rose-700 ring-rose-100"
  },
  {
    value: "hired",
    label: "錄取",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-100"
  }
];

const statusMeta = Object.fromEntries(
  applicationStatuses.map((status) => [status.value, status])
) as Record<ApplicationStatus, (typeof applicationStatuses)[number]>;

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

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }

  return null;
}

function isMissingDataSourceError(error: unknown) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    code === "PGRST116" ||
    code === "PGRST205" ||
    code === "42P01" ||
    code === "42703" ||
    message.includes("could not find the table") ||
    (message.includes("column") && message.includes("does not exist")) ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

export default function EmployerApplicantsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ApplicantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const fetchApplicants = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      setToast({
        type: "error",
        message: "尚未設定 Supabase 環境變數，無法讀取應徵者。"
      });
      return;
    }

    try {
      setIsLoading(true);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error("尚未登入。");
      }

      const workspaceResult = await getEmployerWorkspaceContext(supabase, user.id);

      if (workspaceResult.error) {
        throw new Error(workspaceResult.error);
      }

      if (!workspaceResult.context?.company) {
        setRows([]);
        return;
      }

      let jobsResult = await supabase
        .from("jobs")
        .select("*")
        .eq("company_id", workspaceResult.context.company.id);

      if (
        jobsResult.error &&
        isMissingDataSourceError(jobsResult.error) &&
        workspaceResult.context.isOwner
      ) {
        jobsResult = await supabase
          .from("jobs")
          .select("*")
          .eq("employer_id", user.id);
      }

      if (jobsResult.error) {
        if (isMissingDataSourceError(jobsResult.error)) {
          console.warn("[employer-applicants] jobs table is unavailable; showing empty state", jobsResult.error);
          setRows([]);
          return;
        }

        throw jobsResult.error;
      }

      const typedJobs = (jobsResult.data ?? []) as Job[];
      const jobIds = typedJobs.map((job) => job.id);

      if (jobIds.length === 0) {
        setRows([]);
        return;
      }

      const { data: applications, error: applicationsError } = await supabase
        .from("applications")
        .select("*")
        .in("job_id", jobIds)
        .order("applied_at", { ascending: false });

      if (applicationsError) {
        if (isMissingDataSourceError(applicationsError)) {
          console.warn(
            "[employer-applicants] applications table is unavailable; showing empty state",
            applicationsError
          );
          setRows([]);
          return;
        }

        throw applicationsError;
      }

      const typedApplications = (applications ?? []) as Application[];
      const applicantIds = Array.from(new Set(typedApplications.map((item) => item.user_id)));
      const { data: profiles, error: profilesError } = applicantIds.length
        ? await supabase.from("profiles").select("*").in("id", applicantIds)
        : { data: [], error: null };

      if (profilesError) {
        if (isMissingDataSourceError(profilesError)) {
          console.warn(
            "[employer-applicants] profiles lookup is unavailable; showing applicants without profile details",
            profilesError
          );
        } else {
          throw profilesError;
        }
      }

      const jobsById = new Map(typedJobs.map((job) => [job.id, job]));
      const profilesById = new Map(((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile]));

      setRows(
        typedApplications
          .map((application) => {
            const job = jobsById.get(application.job_id);

            if (!job) {
              return null;
            }

            return {
              application,
              job,
              profile: profilesById.get(application.user_id) ?? null
            };
          })
          .filter((row): row is ApplicantRow => row !== null)
      );
    } catch (error) {
      setToast({
        type: "error",
        message: `應徵者讀取失敗：${getErrorMessage(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const groupedCount = useMemo(() => rows.length, [rows]);

  async function handlePreviewResume(application: Application) {
    if (!supabase) {
      setToast({
        type: "error",
        message: "尚未設定 Supabase 環境變數，無法讀取履歷。"
      });
      return;
    }

    if (!application.resume_url || application.resume_url.startsWith("legacy/")) {
      setToast({
        type: "error",
        message: "此應徵紀錄尚未提供平台履歷。"
      });
      return;
    }

    try {
      setPendingKey(`resume:${application.id}`);
      const { data, error } = await supabase.storage
        .from("resumes")
        .createSignedUrl(application.resume_url, 10 * 60);

      if (error || !data?.signedUrl) {
        throw error ?? new Error("無法產生履歷預覽連結。");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setToast({
        type: "error",
        message: `履歷讀取失敗：${getErrorMessage(error)}`
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleStatusChange(applicationId: string, nextStatus: ApplicationStatus) {
    setPendingKey(`status:${applicationId}`);
    setToast(null);

    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("status", nextStatus);

    const result = await updateEmployerApplicationStatus(formData);

    setPendingKey(null);
    setToast({
      type: result.ok ? "success" : "error",
      message: result.message
    });

    if (result.ok) {
      await fetchApplicants();
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          className={`fixed bottom-5 right-5 z-[90] flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5" aria-hidden="true" />
          )}
          {toast.message}
        </div>
      ) : null}

      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Applicant Tracking Lite
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-900">人才篩選器</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            追蹤所有投遞你公司職缺的遊牧人才，並查看他們的數位履歷。
          </p>
        </div>
        <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200">
          {groupedCount} 位應徵紀錄
        </div>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-4">人才</th>
                <th className="px-6 py-4">應徵職缺</th>
                <th className="px-6 py-4">狀態</th>
                <th className="px-6 py-4">自我推薦信</th>
                <th className="px-6 py-4">投遞時間</th>
                <th className="px-6 py-4 text-right">履歷</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <LoadingRows />
              ) : (
                rows.map((row) => (
                  <tr key={row.application.id} className="transition hover:bg-gray-50/80">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                          {(row.profile?.full_name ?? "U").slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {row.profile?.full_name ?? "未命名人才"}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {row.profile?.title ?? row.profile?.location ?? row.application.user_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-gray-600">{row.job.title}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                            statusMeta[row.application.status]?.className ?? statusMeta.pending.className
                          }`}
                        >
                          {statusMeta[row.application.status]?.label ?? row.application.status}
                        </span>
                        <select
                          value={row.application.status}
                          disabled={pendingKey === `status:${row.application.id}`}
                          onChange={(event) =>
                            handleStatusChange(row.application.id, event.target.value as ApplicationStatus)
                          }
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          {applicationStatuses.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                        {pendingKey === `status:${row.application.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
                        ) : null}
                      </div>
                    </td>
                    <td className="max-w-xs px-6 py-5 text-gray-500">
                      {row.application.cover_letter ? (
                        <p className="max-h-16 overflow-hidden text-xs leading-5">{row.application.cover_letter}</p>
                      ) : (
                        <span className="text-xs text-gray-400">未填寫</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-gray-500">
                      {new Intl.DateTimeFormat("zh-TW").format(new Date(row.application.applied_at))}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handlePreviewResume(row.application)}
                          disabled={pendingKey === `resume:${row.application.id}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
                        >
                          {pendingKey === `resume:${row.application.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          預覽履歷
                        </button>
                        <Link
                          href={`/dashboard/employer/applicants/${row.application.user_id}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-gray-200 transition hover:bg-gray-50"
                        >
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          人才檔案
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <UserRound className="mx-auto h-10 w-10 text-gray-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-gray-600">目前尚無應徵紀錄。</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <tr key={row} className="animate-pulse">
          <td className="px-6 py-5">
            <div className="h-4 w-40 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-28 rounded bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="h-4 w-44 rounded bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="h-6 w-20 rounded-full bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="h-4 w-40 rounded bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="h-4 w-24 rounded bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="ml-auto h-8 w-20 rounded-lg bg-gray-100" />
          </td>
        </tr>
      ))}
    </>
  );
}
