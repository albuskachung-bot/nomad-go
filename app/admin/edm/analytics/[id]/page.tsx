import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  ExternalLink,
  Eye,
  MailCheck,
  MousePointerClick,
  Send
} from "lucide-react";
import { getCurrentAdminContext } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EdmCampaign, EdmCampaignMetrics, EdmTrackingLog } from "@/lib/types";

type CampaignAnalyticsDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type DetailResult = {
  campaign: EdmCampaign;
  metrics: EdmCampaignMetrics;
  logs: EdmTrackingLog[];
};

type TopClickedLink = {
  url: string;
  count: number;
};

const emptyMetrics = (campaignId: string): EdmCampaignMetrics => ({
  campaign_id: campaignId,
  sent_count: 0,
  delivered_count: 0,
  open_count: 0,
  click_count: 0,
  bounce_count: 0,
  created_at: "",
  updated_at: ""
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatPercent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function getRate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

async function getCampaignAnalyticsDetail(campaignId: string): Promise<DetailResult | null> {
  const context = await getCurrentAdminContext();

  if (!context.supabase || !context.user) {
    redirect("/admin/login");
  }

  if (!context.isSuperAdmin && context.profile?.role !== "super_admin") {
    redirect("/admin");
  }

  const supabase = createSupabaseAdminClient() ?? context.supabase;
  const { data: campaignData, error: campaignError } = await supabase
    .from("edm_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError) {
    console.error("[edm/analytics/detail] Failed to load campaign.", campaignError);
    return null;
  }

  const campaign = (campaignData as EdmCampaign | null) ?? null;

  if (!campaign) {
    return null;
  }

  const [{ data: metricsData }, { data: logsData, error: logsError }] =
    await Promise.all([
      supabase
        .from("edm_campaign_metrics")
        .select("*")
        .eq("campaign_id", campaign.id)
        .maybeSingle(),
      supabase
        .from("edm_tracking_logs")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("created_at", { ascending: false })
    ]);

  if (logsError) {
    console.error("[edm/analytics/detail] Failed to load tracking logs.", logsError);
  }

  return {
    campaign,
    metrics: (metricsData as EdmCampaignMetrics | null) ?? emptyMetrics(campaign.id),
    logs: (logsData ?? []) as EdmTrackingLog[]
  };
}

function getTopClickedLinks(logs: EdmTrackingLog[]) {
  const counts = new Map<string, number>();

  logs.forEach((log) => {
    if (log.event_type !== "click" || !log.url) {
      return;
    }

    counts.set(log.url, (counts.get(log.url) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([url, count]) => ({
      url,
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

export default async function CampaignAnalyticsDetailPage({
  params
}: CampaignAnalyticsDetailPageProps) {
  const { id } = await params;
  const detail = await getCampaignAnalyticsDetail(id);

  if (!detail) {
    notFound();
  }

  const { campaign, metrics, logs } = detail;
  const topLinks = getTopClickedLinks(logs);
  const openRate = getRate(metrics.open_count, metrics.delivered_count);
  const ctr = getRate(metrics.click_count, metrics.open_count);
  const funnel = [
    {
      label: "寄出",
      value: metrics.sent_count,
      icon: Send,
      color: "bg-slate-500"
    },
    {
      label: "送達",
      value: metrics.delivered_count,
      icon: MailCheck,
      color: "bg-cyan-500"
    },
    {
      label: "開信",
      value: metrics.open_count,
      icon: Eye,
      color: "bg-emerald-500"
    },
    {
      label: "點擊",
      value: metrics.click_count,
      icon: MousePointerClick,
      color: "bg-violet-500"
    }
  ];
  const maxFunnelValue = Math.max(...funnel.map((item) => item.value), 1);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/edm/analytics"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回成效看板
          </Link>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Campaign Report
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            {campaign.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            {campaign.subject}
          </p>
        </div>

        <Link
          href={`/admin/edm/create?id=${campaign.id}`}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-cyan-100 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
        >
          編輯 Campaign
        </Link>
      </section>

      <section className="grid gap-5 md:grid-cols-4">
        <KpiCard label="寄出" value={metrics.sent_count.toLocaleString()} />
        <KpiCard label="送達" value={metrics.delivered_count.toLocaleString()} />
        <KpiCard label="開信率" value={formatPercent(openRate)} />
        <KpiCard label="點擊率" value={formatPercent(ctr)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">漏斗圖數據</h2>
              <p className="text-xs text-slate-500">
                寄出 {"->"} 送達 {"->"} 開信 {"->"} 點擊
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {funnel.map((item) => {
              const Icon = item.icon;
              const width = Math.max(4, (item.value / maxFunnelValue) * 100);

              return (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold text-slate-950">
                      {item.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <MousePointerClick className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">點擊排行</h2>
              <p className="text-xs text-slate-500">Top Clicked Links</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {topLinks.map((link) => (
              <article
                key={link.url}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="line-clamp-2 break-all text-sm font-semibold text-slate-800 hover:text-cyan-700"
                  >
                    {link.url}
                  </a>
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                </div>
                <p className="mt-2 text-xs font-semibold text-violet-700">
                  {link.count.toLocaleString()} clicks
                </p>
              </article>
            ))}

            {topLinks.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                尚無點擊事件。
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">
        {value}
      </p>
    </article>
  );
}
