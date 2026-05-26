import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, UserRound } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function DashboardFallbackPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-4xl flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
          選擇要前往的後台
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          會員中心與企業雇主中心都會依照目前登入帳號讀寫各自資料，請選擇這次要前往的工作區。
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Link
            href="/dashboard/employer"
            className="rounded-lg bg-white p-6 text-left shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white">
              <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-gray-900">
              企業雇主中心
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              管理職缺、公司品牌、應徵者與招募成效。
            </p>
          </Link>

          <Link
            href="/dashboard/nomad"
            className="rounded-lg bg-white p-6 text-left shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-gray-900">會員中心</h2>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              編輯履歷、查看收藏職缺、應徵紀錄、方案與帳號設定。
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function DashboardIndexPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return <DashboardFallbackPage />;
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/");
  }

  return <DashboardFallbackPage />;
}
