import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="後台資料載入中">
      <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>後台資料載入中...</span>
      </div>
      <div>
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-9 w-64 animate-pulse rounded-lg bg-slate-200" />
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="h-11 w-11 rounded-xl bg-slate-100" />
            <div className="mt-5 h-3 w-28 rounded bg-slate-100" />
            <div className="mt-3 h-7 w-32 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-16 animate-pulse border-b border-slate-100 bg-slate-50" />
        <div className="space-y-4 p-6">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
