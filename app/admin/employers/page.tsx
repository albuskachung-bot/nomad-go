import {
  Building2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Database,
  ExternalLink,
  FileText,
  XCircle
} from "lucide-react";
import { updateCompanyApprovalStatus } from "@/app/admin/actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Company, CompanyApprovalStatus } from "@/lib/types";

type EmployerReviewRecord = Company & {
  verificationDocSignedUrl: string | null;
  verificationDocSignedUrlError: string | null;
};

type EmployersResult = {
  employers: EmployerReviewRecord[];
  usingMockData: boolean;
  notice: string | null;
};

const mockEmployers: EmployerReviewRecord[] = [
  {
    id: "company-001",
    employer_id: "profile-employer-001",
    name: "Cloud Harbor 科技股份有限公司",
    logo_url: null,
    website: "cloudharbor.example.com",
    description: "提供 APAC 企業遠端協作與人才管理 SaaS。",
    approval_status: "approved",
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

async function getEmployers(): Promise<EmployersResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      employers: mockEmployers,
      usingMockData: true,
      notice: "尚未連線至資料庫，以下顯示企業入駐示範資料。"
    };
  }

  try {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const storageClient = createSupabaseAdminClient() ?? supabase;
    const employers = await Promise.all(
      ((data ?? []) as Company[]).map(async (employer) => {
        const documentPath = employer.verification_doc_url?.trim();

        if (!documentPath) {
          return {
            ...employer,
            verificationDocSignedUrl: null,
            verificationDocSignedUrlError: null
          };
        }

        if (isExternalUrl(documentPath)) {
          return {
            ...employer,
            verificationDocSignedUrl: documentPath,
            verificationDocSignedUrlError: null
          };
        }

        const { data: signedUrlData, error: signedUrlError } = await storageClient.storage
          .from("verification_docs")
          .createSignedUrl(documentPath, 60 * 15);

        return {
          ...employer,
          verificationDocSignedUrl: signedUrlData?.signedUrl ?? null,
          verificationDocSignedUrlError: signedUrlError?.message ?? null
        };
      })
    );

    return {
      employers,
      usingMockData: false,
      notice: null
    };
  } catch (error) {
    console.error("[admin/employers] Unable to load employers; rendering fallback.", error);

    return {
      employers: mockEmployers,
      usingMockData: true,
      notice: "企業資料來源暫時無法使用，已切換至示範資料以維持檢視介面。"
    };
  }
}

export default async function AdminEmployersPage() {
  const { employers, usingMockData, notice } = await getEmployers();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Employers
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            企業入駐清單
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            檢視企業資料與 onboarding 完整度，並審核企業是否可以正式使用招募功能。
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          <Database className="h-3.5 w-3.5" aria-hidden="true" />
          {usingMockData ? "Mock employers" : "Live employers"}
        </span>
      </section>

      {notice ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{notice}</p>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">已註冊企業</h2>
            <p className="text-xs text-slate-500">待審核企業可在此頁核准或婉拒。</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">企業名稱</th>
                <th className="px-6 py-4">網站</th>
                <th className="px-6 py-4">企業簡介</th>
                <th className="px-6 py-4">入駐審查資料</th>
                <th className="px-6 py-4">入駐日期</th>
                <th className="px-6 py-4">審核狀態</th>
                <th className="px-6 py-4">資料狀態</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employers.map((employer) => {
                const isPublicProfileComplete = Boolean(
                  employer.name?.trim() && employer.website?.trim()
                );
                const hasTaxId = Boolean(employer.tax_id?.trim());
                const hasVerificationDoc = Boolean(employer.verification_doc_url?.trim());
                const isKybComplete = hasTaxId && hasVerificationDoc;
                const approvalStatus = employer.approval_status ?? "pending";
                const approvalMeta = approvalStatusMeta[approvalStatus];
                const ApprovalIcon = approvalMeta.icon;

                return (
                  <tr key={employer.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-5 font-semibold text-slate-900">
                      {employer.name || "未命名企業"}
                    </td>
                    <td className="px-6 py-5 text-slate-600">
                      {employer.website || "尚未提供"}
                    </td>
                    <td className="max-w-sm px-6 py-5 text-slate-600">
                      {employer.description || "尚未填寫企業簡介"}
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-slate-500">
                            統一編號 / 註冊字號
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {employer.tax_id || "尚未提供"}
                          </p>
                        </div>

                        {employer.verification_doc_url ? (
                          employer.verificationDocSignedUrl ? (
                            <a
                              href={employer.verificationDocSignedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100 transition hover:bg-cyan-100"
                            >
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              查看登記證明
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              文件連結暫不可用
                            </span>
                          )
                        ) : (
                          <span className="text-xs font-medium text-slate-400">
                            尚未上傳登記證明
                          </span>
                        )}

                        {employer.verificationDocSignedUrlError ? (
                          <p className="max-w-xs text-xs leading-5 text-rose-600">
                            {employer.verificationDocSignedUrlError}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-5 text-slate-500">
                      {formatDate(employer.created_at)}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${approvalMeta.className}`}
                      >
                        <ApprovalIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {approvalMeta.label}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2">
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                            isPublicProfileComplete
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-amber-50 text-amber-700 ring-amber-200"
                          }`}
                        >
                          {isPublicProfileComplete ? "公開資料完整" : "公開資料待補"}
                        </span>
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                            isKybComplete
                              ? "bg-cyan-50 text-cyan-700 ring-cyan-200"
                              : "bg-amber-50 text-amber-700 ring-amber-200"
                          }`}
                        >
                          {isKybComplete ? "KYB 已提供" : "KYB 待補"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {approvalStatus === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <form action={submitCompanyApprovalStatus}>
                            <input type="hidden" name="company_id" value={employer.id} />
                            <input type="hidden" name="approval_status" value="approved" />
                            <button
                              type="submit"
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              核准
                            </button>
                          </form>
                          <form action={submitCompanyApprovalStatus}>
                            <input type="hidden" name="company_id" value={employer.id} />
                            <input type="hidden" name="approval_status" value="rejected" />
                            <button
                              type="submit"
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-50 px-3 text-xs font-semibold text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100"
                            >
                              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              婉拒
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="block text-right text-xs font-medium text-slate-400">
                          無待處理動作
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {employers.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-700">目前沒有企業入駐資料。</p>
            <p className="mt-2 text-xs text-slate-500">企業完成 onboarding 後將顯示於此處。</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
