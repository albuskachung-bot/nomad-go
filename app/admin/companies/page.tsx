import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarClock, CircleAlert, Crown, Database } from "lucide-react";
import CompanyPlanOverride from "@/app/admin/companies/CompanyPlanOverride";
import { getCurrentAdminContext } from "@/lib/admin";
import type { Company, CompanySubscriptionPlan } from "@/lib/types";

type CompaniesResult = {
  companies: Company[];
  error: string | null;
};

const planMeta: Record<
  CompanySubscriptionPlan,
  {
    label: string;
    className: string;
  }
> = {
  free: {
    label: "Free",
    className: "bg-slate-100 text-slate-700 ring-slate-200"
  },
  pro: {
    label: "Pro",
    className: "bg-cyan-50 text-cyan-700 ring-cyan-100"
  },
  boost: {
    label: "Boost",
    className: "bg-amber-50 text-amber-700 ring-amber-100"
  }
};

function normalizePlan(value: string | null | undefined): CompanySubscriptionPlan {
  return value === "pro" || value === "boost" ? value : "free";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "未設定";
  }

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

async function getCompanies(): Promise<CompaniesResult> {
  const context = await getCurrentAdminContext();

  if (!context.supabase || !context.isSuperAdmin) {
    redirect("/");
  }

  const { data, error } = await context.supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      companies: [],
      error: error.message
    };
  }

  return {
    companies: (data ?? []) as Company[],
    error: null
  };
}

export default async function AdminCompaniesPage() {
  const { companies, error } = await getCompanies();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Super Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            企業方案控制台
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            檢視所有企業的訂閱狀態，並在金流或客服流程需要時強制調整企業方案。
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
          <Crown className="h-3.5 w-3.5" aria-hidden="true" />
          Super Admin only
        </span>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">企業方案資料讀取失敗。</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-3">
        {(["free", "pro", "boost"] as CompanySubscriptionPlan[]).map((plan) => {
          const meta = planMeta[plan];
          const count = companies.filter(
            (company) => normalizePlan(company.subscription_plan) === plan
          ).length;

          return (
            <article
              key={plan}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${meta.className}`}>
                  {meta.label}
                </span>
                <Database className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </div>
              <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
                {count}
              </p>
              <p className="mt-2 text-sm text-slate-500">家企業目前使用此方案</p>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">企業全覽列表</h2>
            <p className="text-xs text-slate-500">
              下拉選單會直接寫入 companies.subscription_plan。
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">公司名稱</th>
                <th className="px-6 py-4">目前方案</th>
                <th className="px-6 py-4">加入時間</th>
                <th className="px-6 py-4">過期時間</th>
                <th className="px-6 py-4 text-right">Plan Overrider</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((company) => {
                const plan = normalizePlan(company.subscription_plan);
                const meta = planMeta[plan];

                return (
                  <tr key={company.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-5">
                      <div className="font-semibold text-slate-900">
                        <Link
                          href={`/admin/employers/${company.id}`}
                          className="hover:text-cyan-700"
                        >
                          {company.name || "未命名企業"}
                        </Link>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        ID: {company.id}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${meta.className}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        {formatDate(company.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-slate-600">
                      {formatDate(company.plan_expires_at)}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end">
                        <CompanyPlanOverride
                          companyId={company.id}
                          companyName={company.name || "未命名企業"}
                          currentPlan={plan}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {companies.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">尚無企業資料</p>
            <p className="mt-2 text-sm text-slate-500">
              當企業建立公司品牌資料後，就會顯示在這裡。
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
