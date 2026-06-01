import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Globe2,
  ShieldAlert,
  Tags,
  XCircle
} from "lucide-react";
import { updateCompanyApprovalStatus } from "@/app/admin/actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Company, CompanyApprovalStatus } from "@/lib/types";

type AdminEmployerDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type EmployerDetailRecord = Company & {
  verificationDocSignedUrl: string | null;
  verificationDocSignedUrlError: string | null;
};

const mockEmployers: EmployerDetailRecord[] = [
  {
    id: "company-001",
    employer_id: "profile-employer-001",
    name: "Cloud Harbor 科技股份有限公司",
    logo_url: null,
    website: "cloudharbor.example.com",
    description: "提供 APAC 企業遠端協作與人才管理 SaaS。",
    approval_status: "approved",
    industry: "SaaS",
    company_size: "51-200人",
    hq_location: "台灣台北",
    remote_policy: "100% 全遠距",
    perks_tags: ["遠端設備補助", "彈性工時", "年度學習預算"],
    tax_id: "24567890",
    verification_doc_url: "demo/cloud-harbor-registration.pdf",
    verificationDocSignedUrl: null,
    verificationDocSignedUrlError: null,
    created_at: "2026-05-22T03:10:00.000Z",
    updated_at: "2026-05-22T03:10:00.000Z"
  },
  {
    id: "company-002",
    employer_id: "profile-employer-002",
    name: "遠景人才顧問有限公司",
    logo_url: null,
    website: "horizon-talent.example.com",
    description: "跨境招募顧問，聚焦產品與工程遠端職缺。",
    approval_status: "approved",
    industry: "數位行銷",
    company_size: "11-50人",
    hq_location: "遠距無實體總部",
    remote_policy: "依部門彈性調整",
    perks_tags: ["績效獎金", "彈性休假"],
    tax_id: "53881234",
    verification_doc_url: null,
    verificationDocSignedUrl: null,
    verificationDocSignedUrlError: null,
    created_at: "2026-05-19T07:21:00.000Z",
    updated_at: "2026-05-19T07:21:00.000Z"
  },
  {
    id: "company-003",
    employer_id: "profile-employer-003",
    name: "Nomad Stack Ltd.",
    logo_url: null,
    website: null,
    description: "全球工作者工具整合服務，企業資料待補齊。",
    approval_status: "approved",
    industry: null,
    company_size: null,
    hq_location: null,
    remote_policy: null,
    perks_tags: [],
    tax_id: null,
    verification_doc_url: null,
    verificationDocSignedUrl: null,
    verificationDocSignedUrlError: null,
    created_at: "2026-05-15T09:30:00.000Z",
    updated_at: "2026-05-15T09:30:00.000Z"
  }
];

const approvalStatusMeta: Record<
  CompanyApprovalStatus,
  {
    label: string;
    className: string;
    icon: typeof Clock3;
  }
> = {
  pending: {
    label: "待審核",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    icon: Clock3
  },
  approved: {
    label: "已核准",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: CheckCircle2
  },
  rejected: {
    label: "已婉拒",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
    icon: XCircle
  }
};

async function submitCompanyApprovalStatus(formData: FormData) {
  "use server";

  await updateCompanyApprovalStatus(formData);
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

async function withVerificationSignedUrl(
  company: Company,
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>
): Promise<EmployerDetailRecord> {
  const documentPath = company.verification_doc_url?.trim();

  if (!documentPath) {
    return {
      ...company,
      verificationDocSignedUrl: null,
      verificationDocSignedUrlError: null
    };
  }

  if (isExternalUrl(documentPath)) {
    return {
      ...company,
      verificationDocSignedUrl: documentPath,
      verificationDocSignedUrlError: null
    };
  }

  const storageClient = createSupabaseAdminClient() ?? supabase;
  const { data, error } = await storageClient.storage
    .from("verification_docs")
    .createSignedUrl(documentPath, 60 * 15);

  return {
    ...company,
    verificationDocSignedUrl: data?.signedUrl ?? null,
    verificationDocSignedUrlError: error?.message ?? null
  };
}

async function getEmployerDetail(companyId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return mockEmployers.find((company) => company.id === companyId) ?? null;
  }

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[admin/employers/detail] Unable to load employer.", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return withVerificationSignedUrl(data as Company, supabase);
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
        {value || "尚未提供"}
      </p>
    </div>
  );
}

export default async function AdminEmployerDetailPage({
  params
}: AdminEmployerDetailPageProps) {
  const { id } = await params;
  const employer = await getEmployerDetail(id);

  if (!employer) {
    notFound();
  }

  const approvalStatus = employer.approval_status ?? "pending";
  const approvalMeta = approvalStatusMeta[approvalStatus];
  const ApprovalIcon = approvalMeta.icon;
  const websiteHref = getWebsiteHref(employer.website);
  const perksTags = employer.perks_tags ?? employer.benefit_tags ?? [];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/employers"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        返回企業入駐清單
      </Link>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {employer.logo_url ? (
              <div
                className="h-20 w-20 rounded-xl bg-slate-100 bg-contain bg-center bg-no-repeat ring-1 ring-slate-200"
                style={{ backgroundImage: `url(${employer.logo_url})` }}
                aria-hidden="true"
              />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Building2 className="h-9 w-9" aria-hidden="true" />
              </span>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${approvalMeta.className}`}
                >
                  <ApprovalIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {approvalMeta.label}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                  Company ID: {employer.id}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
                {employer.name || "未命名企業"}
              </h1>
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  <Globe2 className="h-4 w-4" aria-hidden="true" />
                  {employer.website}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : (
                <p className="mt-3 text-sm text-slate-500">尚未提供網站連結</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-950">企業品牌完整內容</h2>
            <p className="mt-2 text-sm text-slate-500">
              此區塊為企業前台專頁與職缺頁的公開品牌資料。
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <DetailRow label="產業類別" value={employer.industry} />
              <DetailRow label="公司規模" value={employer.company_size} />
              <DetailRow label="總部位置" value={employer.hq_location ?? employer.headquarters} />
              <DetailRow label="遠距政策" value={employer.remote_policy} />
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                公司簡介
              </p>
              <p className="mt-2 whitespace-pre-line rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                {employer.description || "尚未填寫企業簡介"}
              </p>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-cyan-700" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-900">福利標籤</h3>
              </div>
              {perksTags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {perksTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">尚未提供福利標籤</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <ShieldAlert className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Confidential KYB
                </p>
                <h2 className="mt-1 text-lg font-semibold text-amber-950">
                  入駐審查資料
                </h2>
                <p className="mt-2 text-sm leading-6 text-amber-800">
                  此區塊包含企業身分驗證資料，僅供營運審核與平台風控使用。
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <DetailRow label="統一編號 / 註冊字號" value={employer.tax_id} />
              <div className="rounded-xl border border-amber-100 bg-white/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  商業登記證明
                </p>
                {employer.verification_doc_url ? (
                  employer.verificationDocSignedUrl ? (
                    <a
                      href={employer.verificationDocSignedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-800"
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      查看登記證明
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-rose-700">
                      文件連結暫不可用
                    </p>
                  )
                ) : (
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    尚未上傳登記證明
                  </p>
                )}
                {employer.verificationDocSignedUrlError ? (
                  <p className="mt-3 text-xs leading-5 text-rose-700">
                    {employer.verificationDocSignedUrlError}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-950">審核操作</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              查看完整資料後，可以直接更新此企業的入駐審核狀態。
            </p>

            {approvalStatus === "pending" ? (
              <div className="mt-5 grid gap-3">
                <form action={submitCompanyApprovalStatus}>
                  <input type="hidden" name="company_id" value={employer.id} />
                  <input type="hidden" name="approval_status" value="approved" />
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    核准
                  </button>
                </form>
                <form action={submitCompanyApprovalStatus}>
                  <input type="hidden" name="company_id" value={employer.id} />
                  <input type="hidden" name="approval_status" value="rejected" />
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100"
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    婉拒
                  </button>
                </form>
              </div>
            ) : (
              <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
                目前狀態為「{approvalMeta.label}」，無待處理審核動作。
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
