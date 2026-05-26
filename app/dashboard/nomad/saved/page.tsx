"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Bookmark, Briefcase, ExternalLink, MapPin, Search, Wrench } from "lucide-react";

type SavedTab = "jobs" | "guides" | "tools";

type SavedCard = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  meta: string;
  href: string;
};

const tabs: Array<{
  id: SavedTab;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "jobs", label: "遠端職缺", icon: Briefcase },
  { id: "guides", label: "城市指南", icon: MapPin },
  { id: "tools", label: "實用工具", icon: Wrench }
];

const savedItems: Record<SavedTab, SavedCard[]> = {
  jobs: [
    {
      id: "job-1",
      title: "Remote Product Designer",
      subtitle: "Atlas Studio",
      description: "協助跨國 SaaS 團隊優化 onboarding 與 growth experiments。",
      meta: "全職遠端 · UTC+8 友善",
      href: "/jobs"
    },
    {
      id: "job-2",
      title: "Next.js Full-stack Engineer",
      subtitle: "Nomad Commerce Lab",
      description: "建置旅遊電商與會員制平台，需熟悉 Supabase 與 Stripe。",
      meta: "專案接案 · Asia timezone",
      href: "/jobs"
    }
  ],
  guides: [
    {
      id: "guide-1",
      title: "清邁 Chiang Mai",
      subtitle: "Thailand",
      description: "低生活成本、咖啡廳工作文化成熟，適合初次長住的數位遊牧者。",
      meta: "預估月費 USD 1,200 · UTC+7",
      href: "/toolkit"
    },
    {
      id: "guide-2",
      title: "里斯本 Lisbon",
      subtitle: "Portugal",
      description: "歐洲遠端工作熱點，社群密度高，適合拓展國際人脈。",
      meta: "預估月費 USD 2,400 · UTC+0",
      href: "/toolkit"
    }
  ],
  tools: []
};

export default function NomadSavedPage() {
  const [activeTab, setActiveTab] = useState<SavedTab>("jobs");
  const activeItems = useMemo(() => savedItems[activeTab], [activeTab]);

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Saved Jobs
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-gray-900">
            我的收藏
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            集中管理你想稍後比較的職缺、城市與工具。
          </p>
        </div>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg border border-emerald-100 bg-white p-1.5 shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-w-max items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeItems.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {activeItems.map((item) => (
            <article
              key={item.id}
              className="rounded-lg bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-sm font-medium text-emerald-700">{item.subtitle}</p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Bookmark className="h-4 w-4 fill-current" aria-hidden="true" />
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-gray-500">{item.description}</p>
              <p className="mt-4 text-xs font-medium text-gray-400">{item.meta}</p>

              <Link
                href={item.href}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
              >
                查看詳情
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-400">
        <Search className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-base font-semibold text-gray-900">目前還沒有收藏</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        看到有興趣的職缺、城市指南或工具時，可以先收藏起來，稍後再回來比較。
      </p>
      <Link
        href="/jobs"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
      >
        去探索
      </Link>
    </div>
  );
}
