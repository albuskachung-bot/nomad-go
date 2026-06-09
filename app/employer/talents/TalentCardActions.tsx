"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Lock, Loader2, UserRound, X } from "lucide-react";
import { triggerProfileView } from "@/app/actions/employerTalents";

type TalentCardActionsProps = {
  targetUserId: string;
  companyId: string | null;
  companyName: string | null;
};

export default function TalentCardActions({
  targetUserId,
  companyId,
  companyName
}: TalentCardActionsProps) {
  const isProCompany = false;
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleViewProfile() {
    setError(null);

    if (!isProCompany) {
      setIsPaywallOpen(true);
      return;
    }

    if (!companyId || !companyName) {
      setError("請先完成企業 Workspace 設定後再查看完整履歷。");
      return;
    }

    startTransition(async () => {
      const result = await triggerProfileView(targetUserId, companyId, companyName);

      if (!result.ok) {
        setError(result.error ?? "履歷瀏覽紀錄寫入失敗。");
        return;
      }

      window.location.href = `/talents/${targetUserId}`;
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleViewProfile}
        disabled={isPending}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <UserRound className="h-4 w-4" aria-hidden="true" />
        )}
        {isPending ? "開啟中..." : "查看完整履歷"}
        <span className="sr-only">View Profile</span>
      </button>

      {error ? <p className="mt-3 text-xs leading-5 text-rose-600">{error}</p> : null}

      {isPaywallOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            aria-label="關閉升級提示"
            onClick={() => setIsPaywallOpen(false)}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="talent-paywall-title"
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Lock className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2
                  id="talent-paywall-title"
                  className="mt-4 text-2xl font-semibold tracking-normal text-slate-950"
                >
                  解鎖完整履歷與主動邀約功能
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPaywallOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="關閉"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-600">
              免費方案僅能瀏覽人才摘要。升級企業 Pro 方案 ($49/mo)，即可解鎖人才聯絡方式、完整經歷，並獲得無限次主動面試邀約權限。
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/employer/billing"
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                立即升級方案
              </Link>
              <button
                type="button"
                onClick={() => setIsPaywallOpen(false)}
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                稍後再說
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
