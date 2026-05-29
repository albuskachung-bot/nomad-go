"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import { updateAdminContentItem } from "@/app/admin/actions";
import type { ContentStatus } from "@/lib/types";

type AdminJobReviewActionsProps = {
  jobId: string;
  status: ContentStatus;
  disabled?: boolean;
};

type Toast = {
  type: "success" | "error";
  message: string;
} | null;

const statusMessages: Record<Extract<ContentStatus, "published" | "rejected">, string> = {
  published: "職缺已核准上架。",
  rejected: "職缺已退回修改。"
};

export default function AdminJobReviewActions({
  jobId,
  status,
  disabled = false
}: AdminJobReviewActionsProps) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<ContentStatus | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function updateStatus(nextStatus: Extract<ContentStatus, "published" | "rejected">) {
    if (disabled || status === nextStatus) {
      return;
    }

    setToast(null);
    setPendingStatus(nextStatus);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("table", "jobs");
      formData.set("id", jobId);
      formData.set("next_status", nextStatus);

      try {
        const result = await updateAdminContentItem(formData);

        setToast({
          type: result.ok ? "success" : "error",
          message: result.ok ? statusMessages[nextStatus] : result.message
        });

        if (result.ok) {
          router.refresh();
        }
      } catch (error) {
        setToast({
          type: "error",
          message: error instanceof Error ? error.message : "職缺狀態更新失敗。"
        });
      } finally {
        setPendingStatus(null);
      }
    });
  }

  const approvePending = isPending && pendingStatus === "published";
  const rejectPending = isPending && pendingStatus === "rejected";

  return (
    <div className="flex flex-col items-end gap-2">
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

      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled
          title="AI 審核服務尚未串接"
          className="inline-flex h-9 cursor-not-allowed items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-500"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          啟動 AI 審核
        </button>
        <button
          type="button"
          disabled={disabled || isPending || status === "published"}
          onClick={() => updateStatus("published")}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-100 disabled:text-emerald-500"
        >
          {approvePending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          核准上架
        </button>
        <button
          type="button"
          disabled={disabled || isPending || status === "rejected"}
          onClick={() => updateStatus("rejected")}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-rose-300 disabled:ring-rose-100"
        >
          {rejectPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          退回修改
        </button>
      </div>
    </div>
  );
}
