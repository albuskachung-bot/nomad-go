import Link from "next/link";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-slate-900">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <SearchX className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">找不到這個頁面</h1>
            <p className="mt-1 text-sm text-slate-500">
              這個連結可能已移除，或目前沒有對應的頁面。
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          回到首頁
        </Link>
      </section>
    </main>
  );
}
