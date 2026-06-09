"use client";

import Link from "next/link";
import { MessageCircle, X } from "lucide-react";

type DirectConnectButtonProps = {
  tokens: number;
};

export default function DirectConnectButton({ tokens }: DirectConnectButtonProps) {
  const hasTokens = tokens > 0;
  const modalId = hasTokens ? "direct-connect-confirm" : "direct-connect-upsell";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const dialog = document.getElementById(modalId) as HTMLDialogElement | null;
          dialog?.showModal();
        }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        💬 直接私訊 Hiring Manager
      </button>

      <dialog
        id="direct-connect-confirm"
        className="w-full max-w-md rounded-2xl bg-white p-0 text-left shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase text-blue-700">Direct Connect</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                將扣除 1 點 Token，是否傳送私訊？
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                你目前還有 {tokens} 點 Direct Connect Token。確認後會開啟私訊流程。
              </p>
            </div>
            <form method="dialog">
              <button
                type="submit"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="關閉"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </form>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <form method="dialog" className="flex-1">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                確認傳送私訊
              </button>
            </form>
            <form method="dialog" className="flex-1">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                取消
              </button>
            </form>
          </div>
        </div>
      </dialog>

      <dialog
        id="direct-connect-upsell"
        className="w-full max-w-md rounded-2xl bg-white p-0 text-left shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase text-blue-700">Upgrade Required</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                免費私訊額度已用盡
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                升級 Pro 每月獲得無限暢聊權限，主動敲門正在招募的 Hiring Manager。
              </p>
            </div>
            <form method="dialog">
              <button
                type="submit"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="關閉"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </form>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/nomad/billing"
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              前往升級 Pro
            </Link>
            <form method="dialog" className="flex-1">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                稍後再說
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
