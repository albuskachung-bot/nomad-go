import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BriefcaseBusiness,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  XCircle
} from "lucide-react";
import {
  deleteJob,
  toggleJobStatus,
  type JobStatus
} from "@/app/employer/jobs/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseClient = NonNullable<
  Awaited<ReturnType<typeof createSupabaseServerClient>>
>;

type EmployerJobsPageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    deleted?: string;
    "status-updated"?: string;
    error?: string;
  }>;
};

type EmployerJob = {
  id: string;
  title?: string | null;
  job_type?: string | null;
  work_type?: string | null;
  location?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  status?: JobStatus | string | null;
  applicants_count?: number | null;
  views_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const statusConfig: Record<
  JobStatus,
  {
    label: string;
    className: string;
  }
> = {
  draft: {
    label: "草稿",
    className: "bg-slate-100 text-slate-700 ring-slate-200"
  },
  pending: {
    label: "審核中",
    className: "bg-amber-50 text-amber-700 ring-amber-200"
  },
  published: {
    label: "已發布",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200"
  },
  closed: {
    label: "已下架",
    className: "bg-zinc-100 text-zinc-600 ring-zinc-200"
  }
};

const jobTypeLabels: Record<string, string> = {
  full_time: "全職",
  part_time: "兼職",
  contract: "約聘",
  freelance: "接案",
  internship: "實習"
};

const workTypeLabels: Record<string, string> = {
  remote: "遠端",
  hybrid: "混合",
  onsite: "現場"
};

function formatDate(value?: string | null) {
  if (!value) {
    return "尚未發布";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "日期待確認";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(parsed);
}

function formatJobType(job: EmployerJob) {
  const jobType = job.job_type ? jobTypeLabels[job.job_type] ?? job.job_type : null;
  const workType = job.work_type
    ? workTypeLabels[job.work_type] ?? job.work_type
    : null;

  return [jobType, workType].filter(Boolean).join(" / ") || "型態未設定";
}

function formatSalary(job: EmployerJob) {
  const currency = job.salary_currency ?? "TWD";
  const min = job.salary_min;
  const max = job.salary_max;

  if (typeof min === "number" && typeof max === "number") {
    return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
  }

  if (typeof min === "number") {
    return `${currency} ${min.toLocaleString()} 起`;
  }

  if (typeof max === "number") {
    return `${currency} ${max.toLocaleString()} 以內`;
  }

  return "薪資面議";
}

function normalizeStatus(status?: string | null): JobStatus {
  if (
    status === "draft" ||
    status === "pending" ||
    status === "published" ||
    status === "closed"
  ) {
    return status;
  }

  return "draft";
}

async function getEmployerCompanyIds(supabase: SupabaseClient, userId: string) {
  const ids = new Set<string>();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  const profileRecord = (profile ?? {}) as Record<string, unknown>;

  if (typeof profileRecord.company_id === "string") {
    ids.add(profileRecord.company_id);
  }

  for (const column of ["owner_id", "user_id", "employer_id", "created_by"]) {
    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .eq(column, userId);

    if (!error) {
      for (const company of data ?? []) {
        const id = (company as { id?: unknown }).id;
        if (typeof id === "string") {
          ids.add(id);
        }
      }
    }
  }

  return Array.from(ids);
}

async function fetchJobsByColumn(
  supabase: SupabaseClient,
  column: string,
  value: string | string[]
) {
  const query = supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });
  const { data, error } = Array.isArray(value)
    ? await query.in(column, value)
    : await query.eq(column, value);

  return {
    data: ((data ?? []) as EmployerJob[]) ?? [],
    error
  };
}

async function getEmployerJobs() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const jobsById = new Map<string, EmployerJob>();
  let hadSuccessfulScopedQuery = false;
  const companyIds = await getEmployerCompanyIds(supabase, user.id);
  const scopedQueries: Array<[string, string | string[]]> = [
    ...(companyIds.length > 0 ? ([["company_id", companyIds]] as Array<[string, string | string[]]>) : []),
    ["employer_id", user.id],
    ["created_by", user.id]
  ];

  for (const [column, value] of scopedQueries) {
    const { data, error } = await fetchJobsByColumn(supabase, column, value);

    if (!error) {
      hadSuccessfulScopedQuery = true;
      for (const job of data) {
        jobsById.set(job.id, job);
      }
    }
  }

  if (hadSuccessfulScopedQuery) {
    return Array.from(jobsById.values()).sort((a, b) => {
      const aTime = new Date(a.created_at ?? 0).getTime();
      const bTime = new Date(b.created_at ?? 0).getTime();
      return bTime - aTime;
    });
  }

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[employer-jobs] Failed to load jobs.", error);
    return [];
  }

  return (data ?? []) as EmployerJob[];
}

export default async function EmployerJobsPage({
  searchParams
}: EmployerJobsPageProps) {
  const query = await searchParams;
  const jobs = await getEmployerJobs();
  const notice = query?.created
    ? "職缺已建立，已送出審核。"
    : query?.updated
      ? "職缺已更新。"
      : query?.deleted
        ? "職缺已刪除。"
        : query?.["status-updated"]
          ? "職缺狀態已更新。"
          : null;
  const error = query?.error ?? null;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Jobs
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            職缺管理
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            管理企業所有職缺、上下架狀態與應徵成效。
          </p>
        </div>

        <Link
          href="/employer/jobs/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          發布新職缺
        </Link>
      </section>

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {jobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">職缺</th>
                  <th className="px-5 py-4">工作型態</th>
                  <th className="px-5 py-4">薪資區間</th>
                  <th className="px-5 py-4">發布日期</th>
                  <th className="px-5 py-4">狀態</th>
                  <th className="px-5 py-4">成效</th>
                  <th className="px-5 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => {
                  const status = normalizeStatus(job.status);
                  const statusStyle = statusConfig[status];
                  const closeAction = toggleJobStatus.bind(null, job.id, "closed");
                  const publishAction = toggleJobStatus.bind(
                    null,
                    job.id,
                    "published"
                  );
                  const deleteAction = deleteJob.bind(null, job.id);

                  return (
                    <tr key={job.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                            <BriefcaseBusiness
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/employer/jobs/${job.id}/edit`}
                              className="font-semibold text-slate-950 hover:text-cyan-700"
                            >
                              {job.title ?? "未命名職缺"}
                            </Link>
                            <p className="mt-1 text-xs text-slate-500">
                              {job.location ?? "地點未設定"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatJobType(job)}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatSalary(job)}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyle.className}`}
                        >
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" aria-hidden="true" />
                            {job.applicants_count ?? 0} 人應徵
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            {job.views_count ?? 0} 次瀏覽
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <details className="group relative inline-block text-left">
                          <summary className="inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 [&::-webkit-details-marker]:hidden">
                            <MoreVertical className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">開啟職缺操作選單</span>
                          </summary>
                          <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
                            <Link
                              href={`/employer/jobs/${job.id}/edit`}
                              className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                              編輯
                            </Link>

                            {status === "closed" ? (
                              <form action={publishAction}>
                                <button
                                  type="submit"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                                >
                                  <RotateCcw
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                  重新上架
                                </button>
                              </form>
                            ) : (
                              <form action={closeAction}>
                                <button
                                  type="submit"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                                >
                                  <XCircle
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                  下架
                                </button>
                              </form>
                            )}

                            <form action={deleteAction}>
                              <button
                                type="submit"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                刪除
                              </button>
                            </form>
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
              <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-950">
              尚未建立職缺
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              建立第一個職缺後，這裡會顯示狀態、應徵人數與快捷管理操作。
            </p>
            <Link
              href="/employer/jobs/create"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              發布新職缺
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
