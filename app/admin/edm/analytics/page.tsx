import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CircleAlert,
  Eye,
  MousePointerClick,
  Send,
  TrendingUp
} from "lucide-react";
import { getCurrentAdminContext } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EdmCampaign, EdmCampaignMetrics } from "@/lib/types";

type CampaignAnalyticsRow = {
  campaign: EdmCampaign;
  metrics: EdmCampaignMetrics;
};

type AnalyticsResult = {
  rows: CampaignAnalyticsRow[];
  error: string | null;
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

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "未設定";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "日期待確認";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(parsedDate);
}

async function getAnalyticsRows(): Promise<AnalyticsResult> {
  const context = await getCurrentAdminContext();

  if (!context.supabase || !context.user) {
    redirect("/admin/login");
  }

  if (!context.isSuperAdmin && context.profile?.role !== "super_admin") {
    redirect("/admin");
  }

  const supabase = createSupabaseAdminClient() ?? context.supabase;
  const { data: campaigns, error: campaignsError } = await supabase
    .from("edm_campaigns")
    .select("*")
    .in("status", ["completed", "sending", "scheduled"])
    .order("updated_at", { ascending: false });

  if (campaignsError) {
    return {
      rows: [],
      error: campaignsError.message
    };
  }

  const typedCampaigns = (campaigns ?? []) as EdmCampaign[];
  const campaignIds = typedCampaigns.map((campaign) => campaign.id);

  if (campaignIds.length === 0) {
    return {
      rows: [],
      error: null
    };
  }

  const { data: metrics, error: metricsError } = await supabase
    .from("edm_campaign_metrics")
    .select("*")
    .in("campaign_id", campaignIds);

  if (metricsError) {
    return {
      rows: [],
      error: metricsError.message
    };
  }

  const metricsByCampaignId = new Map(
    ((metrics ?? []) as EdmCampaignMetrics[]).map((metric) => [
      metric.campaign_id,
      metric
    ])
  );

  return {
    rows: typedCampaigns.map((campaign) => ({
      campaign,
      metrics: metricsByCampaignId.get(campaign.id) ?? emptyMetrics(campaign.id)
    })),
    error: null
  };
}

function ProgressBar({ value }: { value: number }) {
  const percent = Math.max(0, Math.min(100, value * 100));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-cyan-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default async function AdminEdmAnalyticsPage() {
  const { rows, error } = await getAnalyticsRows();
  const totals = rows.reduce(
    (accumulator, row) => ({
      sent: accumulator.sent + row.metrics.sent_count,
      delivered: accumulator.delivered + row.metrics.delivered_count,
      opened: accumulator.opened + row.metrics.open_count,
      clicked: accumulator.clicked + row.metrics.click_count,
      bounced: accumulator.bounced + row.metrics.bounce_count
    }),
    {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0
    }
  );
  const totalOpenRate = getRate(totals.opened, totals.delivered);
  const totalCtr = getRate(totals.clicked, totals.opened);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/edm"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回 EDM 列表
          </Link>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-cyan-700">
            EDM Analytics
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            成效數據看板
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            追蹤已發送 Campaign 的送達、開信、點擊與退信表現。
          </p>
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">EDM 成效資料讀取失敗。</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-4">
        <MetricCard icon={Send} label="寄出" value={totals.sent.toLocaleString()} />
        <MetricCard
          icon={Eye}
          label="開信率"
          value={formatPercent(totalOpenRate)}
          helper={`${totals.opened.toLocaleString()} / ${totals.delivered.toLocaleString()}`}
        />
        <MetricCard
          icon={MousePointerClick}
          label="點擊率"
          value={formatPercent(totalCtr)}
          helper={`${totals.clicked.toLocaleString()} / ${totals.opened.toLocaleString()}`}
        />
        <MetricCard
          icon={TrendingUp}
          label="退信"
          value={totals.bounced.toLocaleString()}
        />
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Campaign 成效</h2>
            <p className="text-xs text-slate-500">
              Open Rate = open_count / delivered_count；CTR = click_count / open_count。
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">Campaign</th>
                <th className="px-6 py-4">寄出</th>
                <th className="px-6 py-4">送達</th>
                <th className="px-6 py-4">開信率</th>
                <th className="px-6 py-4">點擊率</th>
                <th className="px-6 py-4">更新時間</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ campaign, metrics }) => {
                const openRate = getRate(metrics.open_count, metrics.delivered_count);
                const ctr = getRate(metrics.click_count, metrics.open_count);

                return (
                  <tr key={campaign.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-5">
                      <Link
                        href={`/admin/edm/analytics/${campaign.id}`}
                        className="font-semibold text-slate-900 hover:text-cyan-700"
                      >
                        {campaign.name}
                      </Link>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {campaign.subject}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-slate-700">
                      {metrics.sent_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-slate-700">
                      {metrics.delivered_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-5">
                      <div className="w-40 space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{formatPercent(openRate)}</span>
                          <span className="text-slate-400">
                            {metrics.open_count.toLocaleString()}
                          </span>
                        </div>
                        <ProgressBar value={openRate} />
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="w-40 space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{formatPercent(ctr)}</span>
                          <span className="text-slate-400">
                            {metrics.click_count.toLocaleString()}
                          </span>
                        </div>
                        <ProgressBar value={ctr} />
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-600">
                      {formatDate(metrics.updated_at || campaign.updated_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">尚無成效資料</p>
            <p className="mt-2 text-sm text-slate-500">
              Campaign 完成發送並收到 webhook 事件後，數據會顯示在這裡。
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper
}: {
  icon: typeof Send;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <Icon className="h-5 w-5 text-cyan-700" aria-hidden="true" />
      <p className="mt-5 text-3xl font-semibold tracking-normal text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-500">{label}</p>
      {helper ? <p className="mt-1 text-xs text-slate-400">{helper}</p> : null}
    </article>
  );
}
