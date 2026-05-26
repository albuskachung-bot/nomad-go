"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-slate-900">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">系統暫時無法載入</h1>
            <p className="mt-1 text-sm text-slate-500">
              請重新整理頁面，或稍後再試。
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          重新載入
        </button>
      </section>
    </main>
  );
}
