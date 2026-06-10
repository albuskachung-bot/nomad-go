import {
  BriefcaseBusiness,
  MessageCircle,
  Crown,
  FileText,
  type LucideIcon
} from "lucide-react";
import {
  getEmployerDashboardStats,
  type EmployerDashboardStats
} from "@/app/employer/dashboard/actions";
import type { CompanySubscriptionPlan } from "@/lib/types";

type StatCard = {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  accentClassName: string;
};

const planLabels: Record<CompanySubscriptionPlan, string> = {
  free: "Free",
  pro: "Pro",
  boost: "Boost"
};

function buildStatCards(stats: EmployerDashboardStats): StatCard[] {
  return [
    {
      title: "刊登中職缺",
      value: String(stats.activeJobsCount),
      helper: "目前公開招募中的職缺數",
      icon: BriefcaseBusiness,
      accentClassName: "bg-blue-50 text-blue-700"
    },
    {
      title: "累計應徵者",
      value: String(stats.totalApplicants),
      helper: "所有企業職缺收到的履歷總數",
      icon: FileText,
      accentClassName: "bg-emerald-50 text-emerald-700"
    },
    {
      title: "未讀訊息",
      value: String(stats.unreadMessages),
      helper: "待回覆的候選人對話",
      icon: MessageCircle,
      accentClassName: "bg-amber-50 text-amber-700"
    },
    {
      title: "方案狀態",
      value: planLabels[stats.plan],
      helper: "目前企業訂閱方案",
      icon: Crown,
      accentClassName: "bg-violet-50 text-violet-700"
    }
  ];
}

export default async function EmployerDashboardPage() {
  const { stats, error } = await getEmployerDashboardStats();
  const statCards = buildStatCards(stats ?? {
    activeJobsCount: 0,
    totalApplicants: 0,
    unreadMessages: 0,
    plan: "free"
  });

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase text-slate-500">
          Employer Dashboard
        </p>
        <h2 className="text-3xl font-semibold tracking-normal text-slate-950">
          歡迎回來！這是您的企業雇主招募中心
        </h2>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          這裡會集中呈現職缺狀態、履歷動態與方案資訊，讓團隊能快速掌握招募進度。
        </p>
      </section>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.title}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.title}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
                    {card.value}
                  </p>
                </div>
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${card.accentClassName}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>

              <p className="mt-5 text-sm text-slate-500">{card.helper}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
