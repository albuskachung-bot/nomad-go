"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
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
    <main className="min-h-screen bg-gray-50 p-6">
      <section className="mx-auto max-w-xl rounded-lg border border-red-100 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Dashboard 載入失敗
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              請重新載入；若仍然失敗，請確認帳號身分與權限設定。
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              重新載入
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
