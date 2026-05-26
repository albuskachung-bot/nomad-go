import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-slate-700">
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        <span>載入中...</span>
      </div>
    </main>
  );
}
