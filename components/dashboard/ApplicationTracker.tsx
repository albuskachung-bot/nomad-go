import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  FileSearch,
  Mail
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/lib/types";

type ApplicationListRow = {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  appliedAt: string;
  status: ApplicationStatus | "interviewing" | string;
};

type ApplicationQueryRow = {
  id: string;
  job_id: string;
  status: ApplicationStatus | "interviewing" | string;
  applied_at: string;
};

type JobLookupRow = {
  id: string;
  title: string | null;
  company: string | null;
  company_id: string | null;
};

type CompanyLookupRow = {
  id: string;
  name: string | null;
};

const statusStyles: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "待審查",
    className: "bg-slate-100 text-slate-700 ring-slate-200"
  },
  reviewed: {
    label: "已審閱",
    className: "bg-sky-50 text-sky-700 ring-sky-100"
  },
  interview: {
    label: "面試中",
    className: "bg-amber-50 text-amber-700 ring-amber-100"
  },
  interviewing: {
    label: "面試中",
    className: "bg-amber-50 text-amber-700 ring-amber-100"
  },
  rejected: {
    label: "婉拒",
    className: "bg-rose-50 text-rose-700 ring-rose-100"
  },
  hired: {
    label: "已錄取",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-100"
  }
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

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(dateValue));
}

function getStatusMeta(status: string) {
  return (
    statusStyles[status] ?? {
      label: status,
      className: "bg-gray-100 text-gray-600 ring-gray-200"
    }
  );
}

async function loadApplicationRows(): Promise<{
  rows: ApplicationListRow[];
  error: string | null;
}> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      rows: [],
      error: "尚未設定 Supabase 環境變數，無法讀取投遞紀錄。"
    };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/");
  }

  // Applicant dashboard must never select internal_notes.
  const { data: applications, error: applicationsError } = await supabase
    .from("applications")
    .select("id,job_id,status,applied_at")
    .eq("user_id", user.id)
    .order("applied_at", { ascending: false });

  if (applicationsError) {
    return {
      rows: [],
      error: `投遞紀錄讀取失敗：${getErrorMessage(applicationsError)}`
    };
  }

  const typedApplications = (applications ?? []) as ApplicationQueryRow[];
  const jobIds = Array.from(new Set(typedApplications.map((application) => application.job_id)));

  if (jobIds.length === 0) {
    return { rows: [], error: null };
  }

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id,title,company,company_id")
    .in("id", jobIds);

  if (jobsError) {
    return {
      rows: [],
      error: `職缺資料讀取失敗：${getErrorMessage(jobsError)}`
    };
  }

  const typedJobs = (jobs ?? []) as JobLookupRow[];
  const companyIds = Array.from(
    new Set(typedJobs.map((job) => job.company_id).filter((companyId): companyId is string => Boolean(companyId)))
  );

  const { data: companies, error: companiesError } = companyIds.length
    ? await supabase.from("companies").select("id,name").in("id", companyIds)
    : { data: [], error: null };

  if (companiesError) {
    return {
      rows: [],
      error: `公司資料讀取失敗：${getErrorMessage(companiesError)}`
    };
  }

  const jobsById = new Map(typedJobs.map((job) => [job.id, job]));
  const companiesById = new Map(((companies ?? []) as CompanyLookupRow[]).map((company) => [company.id, company]));

  return {
    rows: typedApplications.map((application) => {
      const job = jobsById.get(application.job_id);
      const company = job?.company_id ? companiesById.get(job.company_id) : null;

      return {
        id: application.id,
        jobId: application.job_id,
        jobTitle: job?.title ?? "職缺資料目前不可用",
        companyName: company?.name ?? job?.company ?? "未命名公司",
        appliedAt: application.applied_at,
        status: application.status
      };
    }),
    error: null
  };
}

export default async function ApplicationTracker() {
  const { rows, error } = await loadApplicationRows();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Applications
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            投遞進度追蹤
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            查看你在平台內送出的所有應徵紀錄與目前審核狀態。此頁面只讀取求職者可見欄位，不會讀取企業內部註記。
          </p>
        </div>

        <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-emerald-100">
          {rows.length} 筆投遞紀錄
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700">
          {error}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-emerald-100">
        <div className="border-b border-emerald-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-950">我的投遞紀錄</h3>
        </div>

        {rows.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {rows.map((application) => {
              const status = getStatusMeta(application.status);

              return (
                <article
                  key={application.id}
                  className="grid gap-4 px-5 py-5 transition hover:bg-emerald-50/40 lg:grid-cols-[minmax(0,1fr)_170px_120px_140px]"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                      <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-950">
                        {application.jobTitle}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">{application.companyName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <time dateTime={application.appliedAt}>{formatDate(application.appliedAt)}</time>
                  </div>

                  <div className="flex items-center md:justify-end">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="flex items-center lg:justify-end">
                    <Link
                      href={`/dashboard/nomad/applications/messages?application_id=${application.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      聯絡企業
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <FileSearch className="mx-auto h-11 w-11 text-emerald-200" aria-hidden="true" />
            <h3 className="mt-4 text-base font-semibold text-slate-950">尚未送出任何應徵</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              使用平台內建「立即應徵」投遞履歷後，進度會自動出現在這裡。
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 ring-1 ring-emerald-100">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-emerald-950">狀態說明</h3>
            <p className="mt-2 text-sm leading-6 text-emerald-900">
              待審查代表企業尚未處理；已審閱代表企業已查看資料；面試中、已錄取與婉拒會由企業端 ATS 更新。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
