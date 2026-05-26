import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Dashboard 載入中...</span>
        </div>
        <div className="h-40 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
          <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
        </div>
      </div>
    </div>
  );
}
