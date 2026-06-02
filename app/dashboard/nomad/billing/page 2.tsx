import Link from "next/link";
import { ArrowUpRight, BadgeCheck, CreditCard, Sparkles } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type BillingState = {
  sponsoredUntil: string | null;
  userEmail: string | null;
};

export default async function NomadBillingPage() {
  const billingState = await getBillingState();
  const sponsoredUntilDate = billingState.sponsoredUntil
    ? new Date(billingState.sponsoredUntil)
    : null;
  const isVip = Boolean(sponsoredUntilDate && sponsoredUntilDate > new Date());
  const formattedExpiry = sponsoredUntilDate
    ? new Intl.DateTimeFormat("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(sponsoredUntilDate)
    : null;
  const stripePortalUrl = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL;

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Billing
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal text-gray-900">
          方案與帳單
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          查看目前曝光狀態、VIP 到期日與付款紀錄入口。
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section
          className={`rounded-lg bg-white p-6 shadow-sm ${
            isVip ? "ring-2 ring-emerald-100" : ""
          }`}
        >
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  isVip ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                {isVip ? (
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                {isVip ? "VIP 會員" : "免費會員"}
              </div>

              <h3 className="mt-5 text-2xl font-semibold tracking-normal text-gray-900">
                {isVip ? "人才自薦精選曝光中" : "目前使用免費方案"}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
                {isVip
                  ? "你的履歷會在人才頁優先排序，並顯示精選標籤。"
                  : "升級後可獲得首頁與人才列表的優先曝光，讓雇主更快看見你。"}
              </p>
            </div>

            {isVip && formattedExpiry ? (
              <div className="rounded-lg bg-emerald-50 px-5 py-4 text-left sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  到期日
                </p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{formattedExpiry}</p>
              </div>
            ) : null}
          </div>

          {!isVip ? (
            <Link
              href="/pricing"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
            >
              升級方案
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </section>

        <section className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-50 text-gray-600">
            <CreditCard className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-gray-900">帳單管理</h3>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            使用 Stripe Customer Portal 管理付款方式、下載收據與查看帳單紀錄。
          </p>

          {stripePortalUrl ? (
            <a
              href={stripePortalUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:-translate-y-0.5 hover:border-emerald-100 hover:text-emerald-700 hover:shadow-md"
            >
              前往 Stripe 管理帳單與收據
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="mt-6 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-400"
            >
              前往 Stripe 管理帳單與收據
            </button>
          )}

          {billingState.userEmail ? (
            <p className="mt-4 truncate text-xs text-gray-400">帳號：{billingState.userEmail}</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

async function getBillingState(): Promise<BillingState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      sponsoredUntil: null,
      userEmail: null
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      sponsoredUntil: null,
      userEmail: null
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("sponsored_until")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[nomad-billing] failed to load billing state", error);
  }

  return {
    sponsoredUntil: data?.sponsored_until ?? null,
    userEmail: user.email ?? null
  };
}
