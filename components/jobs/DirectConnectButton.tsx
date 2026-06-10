"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Loader2, MessageCircle, X, XCircle } from "lucide-react";
import { executeDirectConnect } from "@/app/actions/hiring";

type DirectConnectButtonProps = {
  isPro: boolean;
  jobId: string;
  tokens: number;
  userId: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
} | null;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return "發生未知錯誤，請稍後再試。";
}

function closeDialog(id: string) {
  const dialog = document.getElementById(id) as HTMLDialogElement | null;
  dialog?.close();
}

export default function DirectConnectButton({
  isPro,
  jobId,
  tokens,
  userId
}: DirectConnectButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<Toast>(null);
  const canAttempt = isPro || tokens > 0;
  const modalId = canAttempt ? "direct-connect-confirm" : "direct-connect-upsell";

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function openModal() {
    if (!userId) {
      setToast({
        type: "error",
        message: "請先登入後再使用 Direct Connect。"
      });
      return;
    }

    const dialog = document.getElementById(modalId) as HTMLDialogElement | null;
    dialog?.showModal();
  }

  function handleConfirm() {
    if (!userId || isPending) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await executeDirectConnect(jobId, userId);
        closeDialog("direct-connect-confirm");
        setToast({
          type: "success",
          message: result.message
        });

        if (result.redirectTo) {
          router.push(result.redirectTo);
        }
      } catch (error) {
        setToast({
          type: "error",
          message: getErrorMessage(error)
        });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-70"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
        )}
        💬 直接私訊 Hiring Manager
      </button>

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

      <dialog
        id="direct-connect-confirm"
        className="w-full max-w-md rounded-2xl bg-white p-0 text-left shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase text-blue-700">Direct Connect</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {isPro ? "是否傳送 Direct Connect 私訊？" : "將扣除 1 點 Token，是否傳送私訊？"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {isPro
                  ? "Pro / VIP 方案可直接主動聯繫 Hiring Manager。"
                  : `你目前還有 ${tokens} 點 Direct Connect Token。確認後會建立私訊對話。`}
              </p>
            </div>
            <form method="dialog">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="關閉"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </form>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {isPending ? "傳送中..." : "確認傳送私訊"}
            </button>
            <form method="dialog" className="flex-1">
              <button
                type="submit"
                disabled={isPending}
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
