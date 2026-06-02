"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LockKeyhole, Rocket, X } from "lucide-react";

type PaywallModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export default function PaywallModal({
  open,
  onClose,
  title = "免費額度已用盡！",
  description = "升級 Pro 方案即可解鎖無限次功能，讓您的求職效率大幅提升。",
  ctaLabel = "查看升級方案",
  ctaHref = "/dashboard/nomad/billing"
}: PaywallModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-modal-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="關閉升級提示"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-6 pb-8 pt-7 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-blue-200 ring-1 ring-white/15">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 id="paywall-modal-title" className="mt-5 text-2xl font-semibold tracking-normal">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-sm font-semibold text-blue-950">Pro 解鎖內容</p>
            <p className="mt-1 text-sm leading-6 text-blue-800">
              不限次數 AI 履歷健檢、求職洞察與優先曝光工具。
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={ctaHref}
              onClick={onClose}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Rocket className="h-4 w-4" aria-hidden="true" />
              {ctaLabel}
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              稍後再說
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
