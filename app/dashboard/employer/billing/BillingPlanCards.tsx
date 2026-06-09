"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  Loader2,
  Rocket,
  ShieldCheck,
  Sparkles,
  XCircle,
  Zap,
  type LucideIcon
} from "lucide-react";
import { requestEmployerPlanChange } from "@/app/dashboard/employer/billing/actions";
import type { CompanySubscriptionPlan } from "@/lib/types";

type Toast = {
  type: "success" | "error";
  message: string;
};

type CheckoutResponse = {
  url?: string;
  error?: string;
};

type PlanCard = {
  id: CompanySubscriptionPlan;
  name: string;
  price: string;
  helper: string;
  icon: LucideIcon;
  accent: string;
  cta: string;
  features: string[];
};

const planCards: PlanCard[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    helper: "適合剛開始測試遠距招募流程的團隊。",
    icon: ShieldCheck,
    accent: "bg-slate-900 text-white",
    cta: "切換至 Free",
    features: ["建立企業品牌頁", "發布基礎職缺", "使用應徵者管理看板"]
  },
  {
    id: "pro",
    name: "Pro",
    price: "$99",
    helper: "適合需要穩定招募與品牌曝光的成長型團隊。",
    icon: Rocket,
    accent: "bg-cyan-600 text-white",
    cta: "升級 Pro",
    features: ["優先企業曝光", "進階職缺數據", "團隊協作與候選人訊息"]
  },
  {
    id: "boost",
    name: "Boost",
    price: "$49",
    helper: "短期提升單一招募檔期的曝光與觸及。",
    icon: Zap,
    accent: "bg-amber-500 text-slate-950",
    cta: "啟用 Boost",
    features: ["職缺限時置頂", "精選職缺標籤", "適合急徵與活動檔期"]
  }
];

export default function BillingPlanCards({
  currentPlan
}: {
  currentPlan: CompanySubscriptionPlan;
}) {
  const router = useRouter();
  const [pendingPlan, setPendingPlan] = useState<CompanySubscriptionPlan | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function startEmployerCheckout(plan: Exclude<CompanySubscriptionPlan, "free">) {
    const response = await fetch("/api/employer/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ planId: plan })
    });
    const data = (await response.json().catch(() => ({}))) as CheckoutResponse;

    if (!response.ok || !data.url) {
      throw new Error(data.error ?? "無法建立 Stripe Checkout，請稍後再試。");
    }

    window.location.assign(data.url);
  }

  function submitPlanChange(plan: CompanySubscriptionPlan) {
    setPendingPlan(plan);

    startTransition(() => {
      if (plan !== "free") {
        void startEmployerCheckout(plan)
          .catch((error: unknown) => {
            setToast({
              type: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "方案結帳啟動失敗，請稍後再試。"
            });
          })
          .finally(() => setPendingPlan(null));
        return;
      }

      void requestEmployerPlanChange(plan)
        .then((result) => {
          setToast({
            type: result.ok ? "success" : "error",
            message: result.message
          });

          if (result.ok) {
            router.refresh();
          }
        })
        .catch((error: unknown) => {
          setToast({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "方案需求送出失敗，請稍後再試。"
          });
        })
        .finally(() => setPendingPlan(null));
    });
  }

  return (
    <>
      {toast ? (
        <div
          className={`fixed bottom-5 right-5 z-[90] flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
          role="status"
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <span>{toast.message}</span>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {planCards.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;
          const isPlanPending = isPending && pendingPlan === plan.id;

          return (
            <article
              key={plan.id}
              className={`relative flex min-h-[390px] flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 transition ${
                isCurrent
                  ? "ring-2 ring-cyan-200 shadow-cyan-100/60"
                  : "ring-slate-200 hover:-translate-y-0.5 hover:shadow-md"
              }`}
            >
              {isCurrent ? (
                <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  當前方案
                </span>
              ) : null}

              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${plan.accent}`}>
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

              <button
                type="button"
                onClick={() => submitPlanChange(plan.id)}
                disabled={isCurrent || isPlanPending}
                className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isCurrent
                    ? "cursor-default bg-slate-100 text-slate-500"
                    : "bg-slate-950 text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
                }`}
              >
                {isPlanPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : isCurrent ? (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                ) : null}
                {isPlanPending ? "送出中..." : isCurrent ? "目前使用中" : plan.cta}
              </button>
            </article>
          );
        })}
      </div>
    </>
  );
}
