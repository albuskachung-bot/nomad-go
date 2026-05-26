import Link from "next/link";
import { LayoutDashboard, SearchX } from "lucide-react";

export default function AdminNotFound() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <SearchX className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            找不到後台頁面
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            請從後台總覽重新進入可用功能。
          </p>
          <Link
            href="/admin"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            回後台總覽
          </Link>
        </div>
      </div>
    </section>
  );
}
