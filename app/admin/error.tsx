"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            營運控制台暫時無法載入
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
            請重新載入頁面。若問題持續，請確認登入權限、資料庫連線與外部服務設定。
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            重新載入
          </button>
        </div>
      </div>
    </section>
  );
}
