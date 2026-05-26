"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import type { PromotionPlanId } from "@/lib/pricing";

export default function PricingCheckoutButton({ planId }: { planId: PromotionPlanId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    setIsLoading(true);
    setError("");

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ planId })
    });

    const payload = (await response.json().catch(() => null)) as {
      url?: string;
      error?: string;
    } | null;

    if (!response.ok || !payload?.url) {
      setIsLoading(false);
      setError(payload?.error ?? "無法建立付款頁面，請稍後再試。");
      return;
    }

    window.location.href = payload.url;
  }

  return (
    <div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        )}
        {isLoading ? "建立付款頁..." : "立即升級"}
      </button>
      {error ? <p className="mt-3 text-sm leading-6 text-amber-700">{error}</p> : null}
    </div>
  );
}
