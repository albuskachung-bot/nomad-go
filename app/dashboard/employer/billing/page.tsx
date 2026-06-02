import Link from "next/link";
import { AlertCircle, CalendarClock, CreditCard, Sparkles } from "lucide-react";
import BillingPlanCards from "@/app/dashboard/employer/billing/BillingPlanCards";
import { getEmployerWorkspaceContext } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompanySubscriptionPlan } from "@/lib/types";

type BillingState = {
  currentPlan: CompanySubscriptionPlan;
  planExpiresAt: string | null;
  companyName: string | null;
  userEmail: string | null;
  error: string | null;
};

const planLabels: Record<CompanySubscriptionPlan, string> = {
  free: "Free",
  pro: "Pro",
  boost: "Boost"
};

function formatDate(value: string | null) {
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

function normalizePlan(value: string | null | undefined): CompanySubscriptionPlan {
  return value === "pro" || value === "boost" ? value : "free";
}

async function getBillingState(): Promise<BillingState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      currentPlan: "free",
      planExpiresAt: null,
      companyName: null,
      userEmail: null,
      error: "尚未設定 Supabase 環境變數，無法讀取企業方案。"
    };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      currentPlan: "free",
      planExpiresAt: null,
      companyName: null,
      userEmail: null,
      error: "請先登入企業雇主中心。"
    };
  }

  const workspace = await getEmployerWorkspaceContext(supabase, user.id);

  if (workspace.error) {
    return {
      currentPlan: "free",
      planExpiresAt: null,
      companyName: null,
      userEmail: user.email ?? null,
      error: workspace.error
    };
  }

  const company = workspace.context?.company;

  if (!company) {
    return {
      currentPlan: "free",
      planExpiresAt: null,
      companyName: null,
      userEmail: user.email ?? null,
      error: "尚未建立公司資料，請先完成公司品牌設定。"
    };
  }

  return {
    currentPlan: normalizePlan(company.subscription_plan),
    planExpiresAt: company.plan_expires_at ?? null,
    companyName: company.name,
    userEmail: user.email ?? null,
    error: null
  };
}

export default async function EmployerBillingPage() {
  const billingState = await getBillingState();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Billing
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            方案與帳單
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            選擇適合目前招募節奏的企業方案。金流串接完成前，切換方案會先送出需求給平台團隊。
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
          {planLabels[billingState.currentPlan]} plan
        </div>
      </section>

      {billingState.error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">{billingState.error}</p>
              <Link
                href="/dashboard/employer/company"
                className="mt-3 inline-flex font-semibold text-amber-900 underline underline-offset-4"
              >
                前往公司品牌設定
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-cyan-200 ring-1 ring-white/10">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold tracking-normal">
            {billingState.companyName ?? "企業方案狀態"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            目前使用 <span className="font-semibold text-white">{planLabels[billingState.currentPlan]}</span>{" "}
            方案。方案欄位由 Super Admin 控制，企業端送出需求後會保留給日後金流與人工審核流程使用。
          </p>
        </div>

        <aside className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-slate-950">方案資訊</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-slate-500">目前方案</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {planLabels[billingState.currentPlan]}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">過期時間</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {formatDate(billingState.planExpiresAt)}
              </dd>
            </div>
            {billingState.userEmail ? (
              <div>
                <dt className="font-medium text-slate-500">帳號</dt>
                <dd className="mt-1 truncate font-semibold text-slate-950">
                  {billingState.userEmail}
                </dd>
              </div>
            ) : null}
          </dl>
        </aside>
      </section>

      <BillingPlanCards currentPlan={billingState.currentPlan} />
    </div>
  );
}
