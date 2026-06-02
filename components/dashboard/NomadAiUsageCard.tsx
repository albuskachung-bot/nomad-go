"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, Sparkles, Zap } from "lucide-react";
import {
  checkUsageQuota,
  type CheckUsageQuotaResult,
  type UsageQuotaSnapshot
} from "@/app/dashboard/nomad/usage/actions";
import PaywallModal from "@/components/billing/PaywallModal";

type NomadAiUsageCardProps = {
  initialQuota: UsageQuotaSnapshot;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

const planLabels: Record<UsageQuotaSnapshot["plan"], string> = {
  free: "Free",
  pro: "Pro",
  vip: "VIP"
};

function formatResetDate(value: string | null) {
  if (!value) {
    return "下月初";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "下月初";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit"
  }).format(parsedDate);
}

function getQuotaLabel(quota: UsageQuotaSnapshot) {
  if (quota.isUnlimited) {
    return "不限次數";
  }

  return `${quota.usageCount}/${quota.freeLimit} 次`;
}

function toSnapshot(result: CheckUsageQuotaResult): UsageQuotaSnapshot {
  return {
    isAuthenticated: result.isAuthenticated,
    plan: result.plan,
    usageCount: result.usageCount,
    freeLimit: result.freeLimit,
    remaining: result.remaining,
    resetDate: result.resetDate,
    isUnlimited: result.isUnlimited
  };
}

export default function NomadAiUsageCard({ initialQuota }: NomadAiUsageCardProps) {
  const [quota, setQuota] = useState(initialQuota);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleRunAiReview() {
    setNotice(null);

    startTransition(async () => {
      const result = await checkUsageQuota();
      setQuota(toSnapshot(result));

      if (!result.allowed) {
        if (result.reason === "quota_exceeded") {
          setIsPaywallOpen(true);
          return;
        }

        setNotice({
          type: "error",
          message: result.message
        });
        return;
      }

      setNotice({
        type: "success",
        message: result.isUnlimited
          ? "AI 履歷健檢已啟動。"
          : `${result.message} AI 履歷健檢已啟動。`
      });
    });
  }

  return (
    <>
      <section className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-blue-200 ring-1 ring-white/10">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-normal">AI 履歷健檢</h2>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-blue-100 ring-1 ring-white/10">
                  {planLabels[quota.plan]} plan
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                免費方案每月可使用 3 次；Pro 與 VIP 可不限次數使用。
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[auto_auto] lg:items-center">
            <div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-xs font-medium text-blue-100">本月 AI 額度</p>
              <p className="mt-1 text-lg font-semibold tracking-normal">{getQuotaLabel(quota)}</p>
              {!quota.isUnlimited ? (
                <p className="mt-1 text-xs text-slate-300">
                  剩餘 {quota.remaining ?? 0} 次，{formatResetDate(quota.resetDate)} 重置
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-300">已解鎖完整額度</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleRunAiReview}
              disabled={isPending || !quota.isAuthenticated}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Zap className="h-4 w-4 text-blue-600" aria-hidden="true" />
              )}
              {isPending ? "檢查額度中..." : "啟動健檢"}
            </button>
          </div>
        </div>

        {notice ? (
          <div
            className={`mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
              notice.type === "success"
                ? "bg-emerald-400/10 text-emerald-100 ring-1 ring-emerald-300/20"
                : "bg-rose-400/10 text-rose-100 ring-1 ring-rose-300/20"
            }`}
            role="status"
          >
            {notice.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{notice.message}</span>
          </div>
        ) : null}
      </section>

      <PaywallModal open={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} />
    </>
  );
}
