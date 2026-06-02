import Link from "next/link";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Crown,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  type LucideIcon
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TalentPlan = "free" | "pro" | "vip";

type BillingState = {
  currentPlan: TalentPlan;
  displayName: string;
  jobTitle: string | null;
  planExpiresAt: string | null;
  userEmail: string | null;
};

type TalentPlanCard = {
  id: TalentPlan;
  name: string;
  price: string;
  helper: string;
  icon: LucideIcon;
  cta: string;
  features: string[];
};

const planLabels: Record<TalentPlan, string> = {
  free: "Free",
  pro: "Pro",
  vip: "VIP"
};

const talentPlans: TalentPlanCard[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    helper: "適合剛開始尋找遠距機會的遊牧者。",
    icon: ShieldCheck,
    cta: "開始使用 Free",
    features: ["建立完整個人專頁", "無限制瀏覽遠距職缺", "基本投遞與追蹤功能"]
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9",
    helper: "適合積極求職，希望脫穎而出的專業人才。",
    icon: Rocket,
    cta: "升級 Pro",
    features: [
      "包含 Free 所有功能",
      "履歷排名優先曝光",
      "查看誰看過我的履歷",
      "解鎖進階薪資數據洞察"
    ]
  },
  {
    id: "vip",
    name: "VIP",
    price: "$19",
    helper: "適合需要建立強大個人品牌的資深接案者/專家。",
    icon: Crown,
    cta: "升級 VIP",
    features: [
      "包含 Pro 所有功能",
      "首頁精選人才列表輪播曝光",
      "專屬 AI 履歷健檢",
      "模擬面試與個人品牌建議"
    ]
  }
];

function formatDate(value: string | null) {
  if (!value) {
    return "無";
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

function getHeroCopy(currentPlan: TalentPlan) {
  if (currentPlan === "vip") {
    return "目前使用 VIP 方案。您的履歷會在精選人才列表中獲得更高曝光，並搭配個人品牌與 AI 履歷健檢資源。";
  }

  if (currentPlan === "pro") {
    return "目前使用 Pro 方案。您的履歷將獲得優先曝光，並解鎖更多求職洞察，協助您更快掌握機會。";
  }

  return "目前使用 Free 方案。升級至 Pro 方案，讓您的履歷在企業端獲得更高的曝光率與優先推薦。";
}

function normalizeTalentPlan(value: string | null | undefined): TalentPlan {
  return value === "pro" || value === "vip" ? value : "free";
}

export default async function NomadBillingPage() {
  const billingState = await getBillingState();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Billing
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            方案與帳單
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            管理您的履歷曝光方案、到期時間與升級選項，讓企業更容易在人才庫中找到您。
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
          {planLabels[billingState.currentPlan]} plan
        </span>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-blue-200 ring-1 ring-white/10">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="mt-6">
            <p className="text-sm font-semibold text-blue-200">
              {billingState.jobTitle ?? "Remote Talent"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">
              {billingState.displayName}
            </h2>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
            {getHeroCopy(billingState.currentPlan)}
          </p>
        </div>

        <aside className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
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
              <dt className="font-medium text-slate-500">到期時間</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {formatDate(billingState.planExpiresAt)}
              </dd>
            </div>
            {billingState.userEmail ? (
              <div>
                <dt className="font-medium text-slate-500">帳號信箱</dt>
                <dd className="mt-1 truncate font-semibold text-slate-950">
                  {billingState.userEmail}
                </dd>
              </div>
            ) : null}
          </dl>
        </aside>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {talentPlans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = billingState.currentPlan === plan.id;

          return (
            <article
              key={plan.id}
              className={`relative flex min-h-[420px] flex-col rounded-2xl p-6 shadow-sm transition ${
                isCurrent
                  ? "border-2 border-blue-200 bg-blue-50/50 shadow-blue-100/60"
                  : "border border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md"
              }`}
            >
              {isCurrent ? (
                <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  目前方案
                </span>
              ) : null}

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  isCurrent ? "bg-blue-600 text-white" : "bg-slate-950 text-white"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>

              <div className="mt-6">
                <h2 className="text-xl font-semibold tracking-normal text-slate-950">
                  {plan.name}
                </h2>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-4xl font-semibold tracking-tight text-slate-950">
                    {plan.price}
                  </span>
                  <span className="pb-1 text-sm font-medium text-slate-500">/ month</span>
                </div>
                <p className="mt-4 min-h-[48px] text-sm leading-6 text-slate-500">
                  {plan.helper}
                </p>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                      aria-hidden="true"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  type="button"
                  disabled
                  className="mt-auto inline-flex w-full cursor-default items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500"
                >
                  <Star className="h-4 w-4" aria-hidden="true" />
                  目前使用中
                </button>
              ) : (
                <Link
                  href={`/pricing?plan=${plan.id}`}
                  className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {plan.cta}
                </Link>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

async function getBillingState(): Promise<BillingState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      currentPlan: "free",
      displayName: "遠距人才",
      jobTitle: null,
      planExpiresAt: null,
      userEmail: null
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      currentPlan: "free",
      displayName: "遠距人才",
      jobTitle: null,
      planExpiresAt: null,
      userEmail: null
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("sponsored_until, subscription_plan, plan_expires_at, full_name, job_title, title")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[nomad-billing] failed to load billing state", error);
  }

  const sponsoredUntil = data?.sponsored_until ?? null;
  const sponsoredUntilDate = sponsoredUntil ? new Date(sponsoredUntil) : null;
  const hasLegacyVip = Boolean(sponsoredUntilDate && sponsoredUntilDate > new Date());
  const profilePlan = normalizeTalentPlan(data?.subscription_plan);
  const currentPlan = profilePlan === "free" && hasLegacyVip ? "vip" : profilePlan;
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;
  const displayName =
    data?.full_name?.trim() || metadataName || user.email?.split("@")[0] || "遠距人才";

  return {
    currentPlan,
    displayName,
    jobTitle: data?.job_title?.trim() || data?.title?.trim() || null,
    planExpiresAt: data?.plan_expires_at ?? (hasLegacyVip ? sponsoredUntil : null),
    userEmail: user.email ?? null
  };
}
