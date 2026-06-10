"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BriefcaseBusiness, LockKeyhole, Rocket, Users, X } from "lucide-react";

type EmployerPaywallVariant = "jobs" | "applicants";

type EmployerPaywallModalProps = {
  open: boolean;
  variant: EmployerPaywallVariant;
  onClose: () => void;
  title?: string;
  description?: string;
};

const variantMeta: Record<
  EmployerPaywallVariant,
  {
    icon: typeof BriefcaseBusiness;
    title: string;
    description: string;
    unlockCopy: string;
  }
> = {
  jobs: {
    icon: BriefcaseBusiness,
    title: "職缺上架額度已滿",
    description: "升級企業方案即可提高同時上架職缺數，持續擴大招募聲量。",
    unlockCopy: "更多同時上架職缺、招募曝光與優先審核資源。"
  },
  applicants: {
    icon: Users,
    title: "免費解鎖額度已用盡",
    description: "升級方案即可繼續解鎖心儀人才的聯絡方式，加速招募決策。",
    unlockCopy: "更多人才聯絡方式解鎖、ATS 協作與進階招募工具。"
  }
};

export default function EmployerPaywallModal({
  open,
  variant,
  onClose,
  title,
  description
}: EmployerPaywallModalProps) {
  const meta = variantMeta[variant];
  const Icon = meta.icon;

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
      aria-labelledby="employer-paywall-title"
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

        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 pb-8 pt-7 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-200 ring-1 ring-white/15">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 id="employer-paywall-title" className="mt-5 text-2xl font-semibold tracking-normal">
            {title ?? meta.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {description ?? meta.description}
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-emerald-950">升級後解鎖</p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">{meta.unlockCopy}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/employer/billing"
              onClick={onClose}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <Rocket className="h-4 w-4" aria-hidden="true" />
              查看升級方案
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
