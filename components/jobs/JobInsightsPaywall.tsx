import Link from "next/link";
import { Lock, TrendingUp } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getCurrentPlanType() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return "free";
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return "free";
  }

  const { data } = await supabase
    .from("profiles")
    .select("plan_type")
    .eq("id", user.id)
    .maybeSingle();

  return data?.plan_type === "pro" || data?.plan_type === "vip"
    ? data.plan_type
    : "free";
}

export default async function JobInsightsPaywall() {
  const planType = await getCurrentPlanType();

  if (planType === "pro" || planType === "vip") {
    return (
      <section className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-700">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              薪資與競爭者落點分析
            </h2>
            <p className="mt-1 text-sm text-slate-600">數據圖表開發中...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-blue-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <TrendingUp className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold uppercase text-blue-700">
            Salary &amp; Competitor Insights
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            目前已有 45 人應徵此職缺
          </h2>
        </div>
      </div>

      <div className="relative mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <div className="pointer-events-none select-none p-5 blur-sm">
          <div className="flex h-52 items-end gap-3">
            {[42, 68, 54, 88, 61, 75, 49].map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg bg-blue-500"
                  style={{ height: `${height}%` }}
                />
                <div className="h-2 w-10 rounded bg-slate-300" />
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="h-16 rounded-lg bg-white ring-1 ring-slate-200" />
            <div className="h-16 rounded-lg bg-white ring-1 ring-slate-200" />
            <div className="h-16 rounded-lg bg-white ring-1 ring-slate-200" />
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center bg-white/45 px-4">
          <div className="max-w-md rounded-2xl bg-white/95 p-5 text-center shadow-xl ring-1 ring-blue-100">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-950">
              解鎖競爭者年資分佈、薪資區間與你的 PR 值落點
            </p>
            <Link
              href="/dashboard/nomad/billing"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              ✨ 升級 Pro 查看競爭者年資分佈與你的 PR 值落點
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
