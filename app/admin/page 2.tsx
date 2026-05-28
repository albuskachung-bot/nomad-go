import { Briefcase, Building2, Clock3, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type StatCard = {
  title: string;
  value: string;
  description: string;
  icon: typeof Users;
};

async function getAdminStats() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      pendingJobs: 0,
      totalMembers: 0,
      employers: 0,
      nomads: 0
    };
  }

  const [pendingJobs, totalMembers, employers, nomads] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("account_type", "employer"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("account_type", "nomad")
  ]);

  return {
    pendingJobs: pendingJobs.count ?? 0,
    totalMembers: totalMembers.count ?? 0,
    employers: employers.count ?? 0,
    nomads: nomads.count ?? 0
  };
}

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();
  const totalSegmented = stats.employers + stats.nomads;
  const employerRatio = totalSegmented
    ? Math.round((stats.employers / totalSegmented) * 100)
    : 0;
  const nomadRatio = totalSegmented ? 100 - employerRatio : 0;

  const cards: StatCard[] = [
    {
      title: "待審核職缺",
      value: stats.pendingJobs.toLocaleString(),
      description: "等待營運團隊審核上架",
      icon: Briefcase
    },
    {
      title: "總會員數",
      value: stats.totalMembers.toLocaleString(),
      description: "包含雇主、遊牧人才與尚未完成 onboarding 的會員",
      icon: Users
    },
    {
      title: "雇主 / 遊牧比例",
      value: `${employerRatio}% / ${nomadRatio}%`,
      description: `${stats.employers.toLocaleString()} 位雇主，${stats.nomads.toLocaleString()} 位遊牧會員`,
      icon: Building2
    }
  ];

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Operations War Room
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-gray-900">
          後台總覽 (Dashboard)
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          即時掌握職缺審核量、會員規模與雙邊市場供需結構。
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {cards.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.title}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <div className="mt-3 text-4xl font-semibold tracking-normal text-gray-900">
                    {stat.value}
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-gray-500">{stat.description}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Clock3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">今日營運焦點</h2>
            <p className="mt-1 text-sm text-gray-500">
              優先處理 pending 職缺，維持雇主送審到上架的回覆速度。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
