"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Crown,
  Rocket,
  ShieldCheck,
  Sparkles,
  UserRound,
  Zap,
  type LucideIcon
} from "lucide-react";

type Audience = "talent" | "employer";

type PricingPlan = {
  id: string;
  name: string;
  price: string;
  interval: string;
  helper: string;
  icon: LucideIcon;
  accent: string;
  badge?: string;
  cta: string;
  features: string[];
};

const audienceLabels: Record<Audience, string> = {
  talent: "遊牧人才方案",
  employer: "招募企業方案"
};

const audienceCopy: Record<
  Audience,
  {
    eyebrow: string;
    title: string;
    description: string;
    heroTitle: string;
    heroDescription: string;
    infoItems: Array<{ label: string; value: string }>;
  }
> = {
  talent: {
    eyebrow: "Talent Pricing",
    title: "讓你的遠距履歷被企業主動看見",
    description:
      "從免費建立個人頁開始，到 Pro 與 VIP 的曝光、洞察與 AI 履歷支援，依照求職節奏自由升級。",
    heroTitle: "遊牧人才成長方案",
    heroDescription:
      "升級後可獲得更高履歷曝光、查看企業互動訊號，並解鎖進階求職工具，讓好機會更快找到你。",
    infoItems: [
      { label: "方案對象", value: "遠距工作者 / 接案者" },
      { label: "升級入口", value: "登入後至人才後台啟用" },
      { label: "免費方案", value: "可永久使用" }
    ]
  },
  employer: {
    eyebrow: "Employer Pricing",
    title: "用清楚可控的方案啟動遠距招募",
    description:
      "從免費測試職缺刊登，到解鎖更多應徵者聯絡方式、非同步面試與招募曝光，讓團隊依需求擴充。",
    heroTitle: "招募企業成長方案",
    heroDescription:
      "企業方案與後台職缺額度、ATS 應徵者管理、聯絡方式解鎖與品牌曝光連動，適合不同招募階段。",
    infoItems: [
      { label: "方案對象", value: "雇主 / 招募團隊" },
      { label: "升級入口", value: "登入後至企業後台啟用" },
      { label: "免費額度", value: "1 個上架職缺與 3 次聯絡解鎖" }
    ]
  }
};

const pricingPlans: Record<Audience, PricingPlan[]> = {
  talent: [
    {
      id: "talent-free",
      name: "Free",
      price: "$0",
      interval: "/ month",
      helper: "適合剛開始尋找遠距機會的遊牧者。",
      icon: ShieldCheck,
      accent: "bg-slate-950 text-white",
      cta: "免費開始",
      features: ["建立完整個人專頁", "無限制瀏覽遠距職缺", "基本投遞與追蹤功能"]
    },
    {
      id: "talent-pro",
      name: "Pro",
      price: "$9",
      interval: "/ month",
      helper: "適合積極求職，希望脫穎而出的專業人才。",
      icon: Rocket,
      accent: "bg-blue-600 text-white",
      badge: "推薦",
      cta: "立即升級 / 註冊解鎖",
      features: [
        "包含 Free 所有功能",
        "履歷排名優先曝光",
        "查看誰看過我的履歷",
        "解鎖進階薪資數據洞察"
      ]
    },
    {
      id: "talent-vip",
      name: "VIP",
      price: "$19",
      interval: "/ month",
      helper: "適合需要建立強大個人品牌的資深接案者/專家。",
      icon: Crown,
      accent: "bg-violet-600 text-white",
      cta: "立即升級 / 註冊解鎖",
      features: [
        "包含 Pro 所有功能",
        "首頁精選人才列表輪播曝光",
        "專屬 AI 履歷健檢",
        "模擬面試與個人品牌建議"
      ]
    }
  ],
  employer: [
    {
      id: "employer-free",
      name: "Free",
      price: "$0",
      interval: "/ month",
      helper: "適合剛開始測試遠距招募流程的團隊。",
      icon: ShieldCheck,
      accent: "bg-slate-950 text-white",
      cta: "免費開始",
      features: [
        "建立企業品牌頁",
        "同時上架 1 個職缺",
        "3 次免費解鎖應徵者聯絡方式",
        "使用應徵者管理看板"
      ]
    },
    {
      id: "employer-pro",
      name: "Pro",
      price: "$99",
      interval: "/ month",
      helper: "適合需要穩定招募與品牌曝光的成長型團隊。",
      icon: BriefcaseBusiness,
      accent: "bg-cyan-600 text-white",
      badge: "成長團隊",
      cta: "立即升級 / 註冊解鎖",
      features: [
        "解鎖更多應徵者聯絡方式",
        "提高同時上架職缺額度",
        "候選人訊息與 ATS 管理",
        "企業品牌與職缺數據洞察"
      ]
    },
    {
      id: "employer-boost",
      name: "Boost",
      price: "$49",
      interval: "/ month",
      helper: "短期提升單一招募檔期的曝光與觸及。",
      icon: Zap,
      accent: "bg-amber-500 text-slate-950",
      cta: "立即升級 / 註冊解鎖",
      features: [
        "職缺限時置頂",
        "精選職缺標籤",
        "非同步面試與自訂篩選問題",
        "適合急徵與活動檔期"
      ]
    }
  ]
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PricingPage() {
  const [audience, setAudience] = useState<Audience>("talent");
  const copy = audienceCopy[audience];
  const plans = pricingPlans[audience];

  return (
    <div className="bg-slate-50">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            {copy.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
            {copy.description}
          </p>

          <div className="mt-8 inline-grid rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2">
            {(["talent", "employer"] as const).map((item) => {
              const Icon = item === "talent" ? UserRound : BriefcaseBusiness;
              const isActive = audience === item;

              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setAudience(item)}
                  className={cx(
                    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition sm:min-w-44",
                    isActive
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {audienceLabels[item]}
                </button>
              );
            })}
          </div>
        </div>

        <section className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-blue-200 ring-1 ring-white/10">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-normal">
              {copy.heroTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              {copy.heroDescription}
            </p>
          </div>

          <aside className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <BadgeCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-slate-950">方案資訊</h2>
            <dl className="mt-5 space-y-4 text-sm">
              {copy.infoItems.map((item) => (
                <div key={item.label}>
                  <dt className="font-medium text-slate-500">{item.label}</dt>
                  <dd className="mt-1 font-semibold text-slate-950">{item.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isFeatured = Boolean(plan.badge);

            return (
              <article
                key={plan.id}
                className={cx(
                  "relative flex min-h-[430px] flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md",
                  isFeatured ? "ring-2 ring-blue-200 shadow-blue-100/60" : "ring-slate-200"
                )}
              >
                {plan.badge ? (
                  <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {plan.badge}
                  </span>
                ) : null}

                <div className={cx("flex h-11 w-11 items-center justify-center rounded-xl", plan.accent)}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>

                <div className="mt-6">
                  <h2 className="text-xl font-semibold tracking-normal text-slate-950">
                    {plan.name}
                  </h2>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-4xl font-semibold tracking-tight text-slate-950">
                      {plan.price}
                    </span>
                    <span className="pb-1 text-sm font-medium text-slate-500">
                      {plan.interval}
                    </span>
                  </div>
                  <p className="mt-4 min-h-[48px] text-sm leading-6 text-slate-500">
                    {plan.helper}
                  </p>
                </div>

                <ul className="mt-6 space-y-3 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/onboarding"
                  className={cx(
                    "mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition",
                    isFeatured
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-slate-950 text-white hover:bg-slate-800"
                  )}
                >
                  {plan.cta}
                </Link>
              </article>
            );
          })}
        </section>
      </section>
    </div>
  );
}
