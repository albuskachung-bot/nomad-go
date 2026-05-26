import {
  BriefcaseBusiness,
  Clock3,
  Crown,
  FileText,
  type LucideIcon
} from "lucide-react";

type StatCard = {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  accentClassName: string;
  skeletonWidth: string;
};

const statCards: StatCard[] = [
  {
    title: "刊登中職缺",
    value: "--",
    helper: "等待串接職缺資料",
    icon: BriefcaseBusiness,
    accentClassName: "bg-blue-50 text-blue-700",
    skeletonWidth: "w-2/3"
  },
  {
    title: "待審核職缺",
    value: "--",
    helper: "等待審核流程資料",
    icon: Clock3,
    accentClassName: "bg-amber-50 text-amber-700",
    skeletonWidth: "w-1/2"
  },
  {
    title: "新收到的履歷",
    value: "--",
    helper: "等待應徵者資料",
    icon: FileText,
    accentClassName: "bg-emerald-50 text-emerald-700",
    skeletonWidth: "w-3/4"
  },
  {
    title: "VIP 方案狀態",
    value: "待確認",
    helper: "等待方案與帳單資料",
    icon: Crown,
    accentClassName: "bg-violet-50 text-violet-700",
    skeletonWidth: "w-1/2"
  }
];

export default function EmployerDashboardPage() {
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

              <div className="mt-6 space-y-3">
                <div className={`h-2 animate-pulse rounded bg-slate-200 ${card.skeletonWidth}`} />
                <div className="h-2 w-full animate-pulse rounded bg-slate-100" />
              </div>

              <p className="mt-5 text-sm text-slate-500">{card.helper}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
