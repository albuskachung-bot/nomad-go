import { redirect } from "next/navigation";
import { Banknote, Bot, Briefcase, Users } from "lucide-react";
import { getCurrentAdminContext } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof getCurrentAdminContext>>["supabase"]>;

function formatCount(value: number) {
  return new Intl.NumberFormat("zh-TW").format(value);
}

async function getOperationalMetrics(supabase: SupabaseClient | null) {
  if (!supabase) {
    return {
      membersCount: 0,
      jobsCount: 0
    };
  }

  const [profilesResult, jobsResult] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
  ]);

  if (profilesResult.error) {
    console.error("[admin] Unable to count profiles.", profilesResult.error);
  }

  if (jobsResult.error) {
    console.error("[admin] Unable to count published jobs.", jobsResult.error);
  }

  return {
    membersCount: profilesResult.count ?? 0,
    jobsCount: jobsResult.count ?? 0
  };
}

export default async function AdminDashboardPage() {
  const { user, isAdmin, supabase } = await getCurrentAdminContext();

  if (!user) {
    redirect("/admin/login");
  }

  if (!isAdmin) {
    redirect("/");
  }

  const { membersCount, jobsCount } = await getOperationalMetrics(supabase);
  const operationalCards = [
    {
      title: "平台總會員數",
      value: formatCount(membersCount),
      change: "Live",
      description: "public.profiles 目前總筆數",
      icon: Users,
      accent: "bg-blue-50 text-blue-700"
    },
    {
      title: "營運中職缺總數",
      value: formatCount(jobsCount),
      change: "Live",
      description: "目前公開且接受申請中的職缺",
      icon: Briefcase,
      accent: "bg-indigo-50 text-indigo-700"
    },
    {
      title: "待 AI 審核任務數",
      value: "0",
      change: "待串接",
      description: "預留自動風險檢查與內容品質審核佇列",
      icon: Bot,
      accent: "bg-amber-50 text-amber-700"
    },
    {
      title: "本月訂閱預估收入 (MRR)",
      value: "NT$ 0",
      change: "待串接",
      description: "依活躍企業方案估算之月 recurring revenue",
      icon: Banknote,
      accent: "bg-emerald-50 text-emerald-700"
    }
  ];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Operations Overview
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            營運數據總覽
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            追蹤平台規模、內容審核與訂閱營收。
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          Live data
        </span>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {operationalCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.title}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.accent}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {stat.change}
                </span>
              </div>
              <p className="mt-5 text-sm font-medium text-slate-500">{stat.title}</p>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {stat.value}
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">{stat.description}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-slate-900">AI 審核模組</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            職缺 inventory 已保留 AI review 狀態與觸發動作；待模型、規則引擎及人工覆核流程完成串接。
          </p>
          <span className="mt-5 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Integration planned
          </span>
        </article>
        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-slate-900">訂閱與開票流程</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            財務控制台已提供交易、發票及 gateway 監控介面，可作為後續 webhook 與電子發票 API 的營運入口。
          </p>
          <span className="mt-5 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            UI ready
          </span>
        </article>
      </section>
    </div>
  );
}
