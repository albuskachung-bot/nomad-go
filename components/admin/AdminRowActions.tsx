"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { updateAdminContentItem } from "@/app/admin/actions";
import type { ContentStatus } from "@/lib/types";

type AdminContentTableName = "jobs" | "guides" | "profiles";

type AdminRowActionsProps = {
  table: AdminContentTableName;
  id: string;
  status: ContentStatus;
  isFeatured: boolean;
};

const statusOptions: Array<{
  value: ContentStatus;
  label: string;
}> = [
  { value: "pending", label: "Pending" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" }
];

export default function AdminRowActions({
  table,
  id,
  status,
  isFeatured
}: AdminRowActionsProps) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [featured, setFeatured] = useState(isFeatured);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [pendingStatus, setPendingStatus] = useState<ContentStatus | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(""), 3000);

    return () => window.clearTimeout(timer);
  }, [toast]);

  function runUpdate(payload: { nextStatus?: ContentStatus; nextFeatured?: boolean }) {
    const previousStatus = currentStatus;
    const previousFeatured = featured;

    if (payload.nextStatus) {
      setCurrentStatus(payload.nextStatus);
    }

    if (typeof payload.nextFeatured === "boolean") {
      setFeatured(payload.nextFeatured);
    }

    setMessage("");

    startTransition(async () => {
      const formData = new FormData();
      formData.set("table", table);
      formData.set("id", id);

      if (payload.nextStatus) {
        formData.set("next_status", payload.nextStatus);
      }

      if (typeof payload.nextFeatured === "boolean") {
        formData.set("next_featured", String(payload.nextFeatured));
      }

      const result = await updateAdminContentItem(formData);

      if (!result.ok) {
        setCurrentStatus(previousStatus);
        setFeatured(previousFeatured);
        setMessage(result.message);
        return;
      }

      setMessage("");
      setToast(result.message || "更新成功。");
    });
  }

  function handleStatusChange(nextStatus: ContentStatus) {
    if (nextStatus === currentStatus) {
      return;
    }

    if (nextStatus === "rejected") {
      setPendingStatus(nextStatus);
      return;
    }

    runUpdate({ nextStatus });
  }

  return (
    <div className="flex min-w-[360px] flex-col items-end gap-2">
      {toast ? (
        <div className="fixed right-5 top-5 z-[80] inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {toast}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
      <label className="sr-only" htmlFor={`${table}-${id}-status`}>
        審核狀態
      </label>
      <select
        id={`${table}-${id}-status`}
        value={currentStatus}
        disabled={isPending}
        onChange={(event) => handleStatusChange(event.target.value as ContentStatus)}
        className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        role="switch"
        aria-checked={featured}
        disabled={isPending}
        onClick={() => runUpdate({ nextFeatured: !featured })}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-60 ${
          featured ? "bg-blue-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition ${
            featured ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
        <span className="sr-only">首頁精選</span>
      </button>

      {isPending ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" /> : null}
      {message ? <span className="max-w-32 truncate text-xs text-rose-600">{message}</span> : null}
      </div>

      <p className="max-w-[260px] text-right text-xs leading-5 text-gray-400">
        💡 開啟後將展示於前台首頁精選區塊。
      </p>

      {pendingStatus ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-950/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900">確認拒絕內容？</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              拒絕後此項目不會出現在前台公開列表，請確認已完成審核判斷。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingStatus(null)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextStatus = pendingStatus;
                  setPendingStatus(null);
                  runUpdate({ nextStatus });
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                確認拒絕
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
