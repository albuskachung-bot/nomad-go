import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  Building2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  FileText,
  Globe2,
  MapPin,
  Sparkles,
  Tags,
  XCircle,
  type LucideIcon
} from "lucide-react";
import AdminJobReviewActions from "@/components/admin/AdminJobReviewActions";
import { mockJobs } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Company, ContentStatus, Job } from "@/lib/types";

type AdminJobDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type SupabaseServerClient = NonNullable<
  Awaited<ReturnType<typeof createSupabaseServerClient>>
>;

type JobWithCompanyRow = Job & {
  companies?: Company | Company[] | null;
};

type AdminJobDetail = {
  job: Job;
  company: Company | null;
  usingMockData: boolean;
  notice: string | null;
};

const publicationStatusMeta: Record<
  ContentStatus,
  {
    label: string;
    description: string;
    className: string;
    icon: LucideIcon;
  }
> = {
  pending: {
    label: "尚未上架",
    description: "前台不公開，等待營運審核。",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    icon: Clock3
  },
  published: {
    label: "公開上架",
    description: "已核准，前台職缺列表可見。",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: CheckCircle2
  },
  rejected: {
    label: "退回未上架",
    description: "已退回企業端修改，前台不公開。",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
    icon: XCircle
  }
};

const reviewStatusMeta: Record<
  ContentStatus,
  {
    label: string;
    className: string;
    icon: LucideIcon;
  }
> = {
  pending: {
    label: "等待審核",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
    icon: Sparkles
  },
  published: {
    label: "已核准",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: CheckCircle2
  },
  rejected: {
    label: "已退回修改",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
    icon: XCircle
  }
};

function formatDate(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "日期待確認";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(parsedDate);
}

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function getWebsiteHref(website: string | null | undefined) {
  if (!website) {
    return null;
  }

  return isExternalUrl(website) ? website : `https://${website}`;
}

function normalizeJoinedCompany(value: Company | Company[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function getCompanyForJob(supabase: SupabaseServerClient, job: Job) {
  if (job.company_id) {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", job.company_id)
      .maybeSingle();

    if (error) {
      console.error("[admin/jobs/detail] Unable to load company by company_id.", error);
      return null;
    }

    return (data as Company | null) ?? null;
  }

  if (job.employer_id) {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("employer_id", job.employer_id)
      .maybeSingle();

    if (error) {
      console.error("[admin/jobs/detail] Unable to load company by employer_id.", error);
      return null;
    }

    return (data as Company | null) ?? null;
  }

  return null;
}

async function getLiveJobDetail(supabase: SupabaseServerClient, jobId: string) {
  const joinedResult = await supabase
    .from("jobs")
    .select("*, companies(*)")
    .eq("id", jobId)
    .maybeSingle();

  if (!joinedResult.error) {
    if (!joinedResult.data) {
      return null;
    }

    const row = joinedResult.data as unknown as JobWithCompanyRow;
    const joinedCompany = normalizeJoinedCompany(row.companies);

    return {
      job: row as Job,
      company: joinedCompany ?? (await getCompanyForJob(supabase, row as Job))
    };
  }

  console.warn(
    "[admin/jobs/detail] Unable to load job with joined company; falling back to separate queries.",
    joinedResult.error
  );

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const job = data as Job;

  return {
    job,
    company: await getCompanyForJob(supabase, job)
  };
}

async function getAdminJobDetail(jobId: string): Promise<AdminJobDetail | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const mockJob = mockJobs.find((job) => job.id === jobId) ?? null;

    return mockJob
      ? {
          job: mockJob,
          company: null,
          usingMockData: true,
          notice: "尚未連線至資料庫，以下顯示職缺示範資料。"
        }
      : null;
  }

  try {
    const liveDetail = await getLiveJobDetail(supabase, jobId);

    if (!liveDetail) {
      return null;
    }

    return {
      ...liveDetail,
      usingMockData: false,
      notice: null
    };
  } catch (error) {
    console.error("[admin/jobs/detail] Unable to load live job detail.", error);

    const mockJob = mockJobs.find((job) => job.id === jobId) ?? null;

    return mockJob
      ? {
          job: mockJob,
          company: null,
          usingMockData: true,
          notice: "職缺資料來源暫時無法使用，已切換至示範資料。"
        }
      : null;
  }
}

function StatusBadge({
  label,
  className,
  icon: Icon
}: {
  label: string;
  className: string;
  icon: LucideIcon;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function DetailMetric({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
        {value || "尚未提供"}
      </p>
    </div>
  );
}

function TextSection({
  title,
  value
}: {
  title: string;
  value: string | null | undefined;
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 whitespace-pre-line rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
        {value?.trim() || "尚未提供"}
      </div>
    </section>
  );
}

export default async function AdminJobDetailPage({ params }: AdminJobDetailPageProps) {
  const { id } = await params;
  const detail = await getAdminJobDetail(id);

  if (!detail) {
    notFound();
  }

  const { job, company, usingMockData, notice } = detail;
  const publicationMeta = publicationStatusMeta[job.status] ?? publicationStatusMeta.pending;
  const reviewMeta = reviewStatusMeta[job.status] ?? reviewStatusMeta.pending;
  const PublicationIcon = publicationMeta.icon;
  const tags = Array.isArray(job.tags) ? job.tags : [];
  const websiteHref = getWebsiteHref(company?.website);
  const companyName = company?.name ?? job.company ?? "未命名企業";

  return (
    <div className="space-y-6">
      <Link
        href="/admin/jobs"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        返回職缺資料庫
      </Link>

      {notice ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{notice}</p>
        </div>
      ) : null}

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                label={`上架狀態：${publicationMeta.label}`}
                className={publicationMeta.className}
                icon={PublicationIcon}
              />
              <StatusBadge
                label={`審核狀態：${reviewMeta.label}`}
                className={reviewMeta.className}
                icon={reviewMeta.icon}
              />
              {job.is_featured ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  精選職缺
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">
              {job.title || "未命名職缺"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              {publicationMeta.description}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            {company?.logo_url ? (
              <div
                className="h-12 w-12 shrink-0 rounded-xl bg-white bg-contain bg-center bg-no-repeat ring-1 ring-slate-200"
                style={{ backgroundImage: `url(${company.logo_url})` }}
                aria-hidden="true"
              />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{companyName}</p>
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
                  官方網站
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : (
                <p className="mt-1 text-xs text-slate-500">尚未提供公司網站</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-950">職缺基本資訊</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <DetailMetric icon={Building2} label="企業名稱" value={companyName} />
              <DetailMetric icon={MapPin} label="工作地點" value={job.location} />
              <DetailMetric
                icon={Briefcase}
                label="職缺類型"
                value={job.employment_type ?? job.job_type}
              />
              <DetailMetric icon={Banknote} label="薪資範圍" value={job.salary_range} />
              <DetailMetric icon={Tags} label="職務類別" value={job.category} />
              <DetailMetric icon={Clock3} label="資歷要求" value={job.experience_level} />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  建立日期
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatDate(job.created_at)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  申請連結
                </p>
                {job.apply_url ? (
                  <a
                    href={job.apply_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                  >
                    查看原始申請連結
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    使用平台內建申請流程
                  </p>
                )}
              </div>
            </div>

            {tags.length > 0 ? (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  技能標籤
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <TextSection title="職缺描述 (Job Description)" value={job.description} />
          <TextSection title="工作職責 / Responsibilities" value={job.responsibilities} />
          <TextSection title="條件要求 / Requirements" value={job.requirements} />
          <TextSection title="加分條件 / Nice to Haves" value={job.nice_to_haves} />
          <TextSection title="福利與待遇 / Benefits" value={job.benefits} />

          {job.rejection_reason ? (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" aria-hidden="true" />
                <div>
                  <h2 className="text-lg font-semibold text-rose-950">退回原因</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-rose-800">
                    {job.rejection_reason}
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-slate-950">審核操作</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  看完完整內容後，可在此啟動 AI 審核預留流程，或直接核准上架、退回修改。
                </p>
              </div>
            </div>
            <div className="mt-5">
              <AdminJobReviewActions
                jobId={job.id}
                status={job.status}
                disabled={usingMockData}
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
