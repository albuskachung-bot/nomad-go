import Link from "next/link";
import { BriefcaseBusiness, UserRound } from "lucide-react";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-4xl flex-col justify-center">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Welcome to NOMAD-GO
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-gray-900">
            選擇要前往的後台
          </h1>
          <p className="mt-4 text-base leading-7 text-gray-500">
            一般會員功能與企業雇主中心都會依照目前登入帳號讀寫資料，不需要先切換或設定身分。
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Link
            href="/dashboard/nomad"
            className="group rounded-lg bg-white p-6 text-left shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-gray-900">一般會員</h2>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              編輯履歷、收藏職缺、查看應徵紀錄，進入通用的會員中心。
            </p>
          </Link>

          <Link
            href="/employer/dashboard"
            className="group rounded-lg bg-white p-6 text-left shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 text-white">
              <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-gray-900">企業雇主</h2>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              發布職缺、管理公司品牌與應徵者，進入企業雇主中心。
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
