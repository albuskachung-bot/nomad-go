"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { updateCompanySubscriptionPlan } from "@/app/admin/actions";
import type { CompanySubscriptionPlan } from "@/lib/types";

type Toast = {
  type: "success" | "error";
  message: string;
};

const planOptions: Array<{
  value: CompanySubscriptionPlan;
  label: string;
}> = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "boost", label: "Boost" }
];

export default function CompanyPlanOverride({
  companyId,
  companyName,
  currentPlan
}: {
  companyId: string;
  companyName: string;
  currentPlan: CompanySubscriptionPlan;
}) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedPlan(currentPlan);
  }, [currentPlan]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function handlePlanChange(nextPlan: CompanySubscriptionPlan) {
    setSelectedPlan(nextPlan);

    const formData = new FormData();
    formData.set("company_id", companyId);
    formData.set("subscription_plan", nextPlan);

    startTransition(() => {
      void updateCompanySubscriptionPlan(formData)
        .then((result) => {
          if (!result.ok) {
            setSelectedPlan(currentPlan);
            setToast({
              type: "error",
              message: result.message
            });
            return;
          }

          setToast({
            type: "success",
            message: `${companyName} 已調整為 ${nextPlan} 方案。`
          });
          router.refresh();
        })
        .catch((error: unknown) => {
          setSelectedPlan(currentPlan);
          setToast({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "企業方案更新失敗，請稍後再試。"
          });
        });
    });
  }

  return (
    <div className="relative">
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

      <label className="sr-only" htmlFor={`subscription-plan-${companyId}`}>
        調整 {companyName} 的訂閱方案
      </label>
      <div className="flex items-center gap-2">
        <select
          id={`subscription-plan-${companyId}`}
          value={selectedPlan}
          onChange={(event) =>
            handlePlanChange(event.target.value as CompanySubscriptionPlan)
          }
          disabled={isPending}
          className="h-10 min-w-32 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-wait disabled:bg-slate-50 disabled:text-slate-400"
        >
          {planOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
        ) : null}
      </div>
    </div>
  );
}
