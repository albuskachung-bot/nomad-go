import { Bookmark, Eye, Send, type LucideIcon } from "lucide-react";

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
    title: "已投遞職缺",
    value: "--",
    helper: "完成資料串接後會顯示你的投遞統計。",
    icon: Send,
    accentClassName: "bg-emerald-50 text-emerald-700",
    skeletonWidth: "w-2/3"
  },
  {
    title: "履歷瀏覽次數",
    value: "--",
    helper: "未來會同步顯示履歷曝光與瀏覽紀錄。",
    icon: Eye,
    accentClassName: "bg-sky-50 text-sky-700",
    skeletonWidth: "w-1/2"
  },
  {
    title: "收藏職缺",
    value: "--",
    helper: "你的收藏清單會集中在會員中心管理。",
    icon: Bookmark,
    accentClassName: "bg-violet-50 text-violet-700",
    skeletonWidth: "w-3/4"
  }
];

export default function MemberDashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase text-emerald-700">
          Member Dashboard
        </p>
        <h2 className="text-3xl font-semibold tracking-normal text-slate-950">
          歡迎回來！這是您的會員中心
        </h2>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          在這裡整理個人履歷、收藏職缺、應徵紀錄、方案與帳號設定。這是所有使用者的預設個人後台，雇主也能從這裡管理自己的會員資料。
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.title}
              className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm"
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
                <div className={`h-2 animate-pulse rounded bg-emerald-100 ${card.skeletonWidth}`} />
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
