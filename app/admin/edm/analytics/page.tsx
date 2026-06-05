import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CircleAlert,
  Eye,
  HeartPulse,
  MailCheck,
  MessageCircle,
  MousePointerClick,
  Send,
  Smartphone,
  TrendingUp
} from "lucide-react";
import { getCurrentAdminContext } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  EdmCampaign,
  EdmCampaignMetrics,
  EdmOmnichannelChannel,
  EdmOmnichannelLog,
  Profile
} from "@/lib/types";

type CampaignAnalyticsRow = {
  campaign: EdmCampaign;
  metrics: EdmCampaignMetrics;
};

type AnalyticsResult = {
  rows: CampaignAnalyticsRow[];
  listHealth: ListHealth;
  omnichannelLogs: EdmOmnichannelLog[];
  error: string | null;
};

type ListHealth = {
  total: number;
  valid: number;
  bounced: number;
  inactive: number;
};

type ChannelPerformanceRow = {
  channel: "email" | EdmOmnichannelChannel;
  label: string;
  sent: number;
  delivered: number;
  converted: number;
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

const emptyListHealth: ListHealth = {
  total: 0,
  valid: 0,
  bounced: 0,
  inactive: 0
};

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
    .in("status", ["completed", "sending", "scheduled", "waiting_for_ab_result"])
    .order("updated_at", { ascending: false });

  if (campaignsError) {
    return {
      rows: [],
      listHealth: emptyListHealth,
      omnichannelLogs: [],
      error: campaignsError.message
    };
  }

  const typedCampaigns = (campaigns ?? []) as EdmCampaign[];
  const campaignIds = typedCampaigns.map((campaign) => campaign.id);
  const { data: metrics, error: metricsError } =
    campaignIds.length > 0
      ? await supabase
          .from("edm_campaign_metrics")
          .select("*")
          .in("campaign_id", campaignIds)
      : { data: [], error: null };

  if (metricsError) {
    return {
      rows: [],
      listHealth: emptyListHealth,
      omnichannelLogs: [],
      error: metricsError.message
    };
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,email_bounced,edm_lifecycle_tags")
    .eq("is_banned", false)
    .eq("is_virtual_author", false);

  if (profileError) {
    return {
      rows: [],
      listHealth: emptyListHealth,
      omnichannelLogs: [],
      error: profileError.message
    };
  }

  const profiles = (profileData ?? []) as Pick<
    Profile,
    "id" | "email_bounced" | "edm_lifecycle_tags"
  >[];
  const listHealth = profiles.reduce(
    (accumulator, profile) => {
      const isBounced = profile.email_bounced === true;
      const isInactive = (profile.edm_lifecycle_tags ?? []).includes("inactive");

      return {
        total: accumulator.total + 1,
        valid: accumulator.valid + (!isBounced && !isInactive ? 1 : 0),
        bounced: accumulator.bounced + (isBounced ? 1 : 0),
        inactive: accumulator.inactive + (!isBounced && isInactive ? 1 : 0)
      };
    },
    { ...emptyListHealth }
  );

  const { data: omnichannelData, error: omnichannelError } = await supabase
    .from("edm_omnichannel_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10000);

  if (omnichannelError) {
    return {
      rows: [],
      listHealth,
      omnichannelLogs: [],
      error: omnichannelError.message
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
    listHealth,
    omnichannelLogs: (omnichannelData ?? []) as EdmOmnichannelLog[],
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
  const { rows, listHealth, omnichannelLogs, error } = await getAnalyticsRows();
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
  const channelRows = getChannelPerformanceRows(totals, omnichannelLogs);

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

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <HeartPulse className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">信箱健康度</h2>
              <p className="text-xs text-slate-500">
                有效名單、退信黑名單與沉睡名單比例。
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <HealthMetric
              label="有效名單"
              value={listHealth.valid}
              total={listHealth.total}
              tone="emerald"
            />
            <HealthMetric
              label="退信黑名單"
              value={listHealth.bounced}
              total={listHealth.total}
              tone="rose"
            />
            <HealthMetric
              label="沉睡名單"
              value={listHealth.inactive}
              total={listHealth.total}
              tone="amber"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">全通路成效</h2>
              <p className="text-xs text-slate-500">
                Email、WhatsApp、SMS 的送達與轉換概況。
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {channelRows.map((row) => {
              const deliveryRate = getRate(row.delivered, row.sent);
              const conversionRate = getRate(row.converted, row.sent);

              return (
                <ChannelRow
                  key={row.channel}
                  row={row}
                  deliveryRate={deliveryRate}
                  conversionRate={conversionRate}
                />
              );
            })}
          </div>
        </div>
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

function getChannelPerformanceRows(
  totals: {
    sent: number;
    delivered: number;
    clicked: number;
  },
  logs: EdmOmnichannelLog[]
): ChannelPerformanceRow[] {
  const byChannel = new Map<EdmOmnichannelChannel, EdmOmnichannelLog[]>();

  logs.forEach((log) => {
    byChannel.set(log.channel, [...(byChannel.get(log.channel) ?? []), log]);
  });

  const buildOmnichannelRow = (
    channel: EdmOmnichannelChannel,
    label: string
  ): ChannelPerformanceRow => {
    const channelLogs = byChannel.get(channel) ?? [];
    const sent = channelLogs.filter((log) =>
      log.status === "sent" || log.status === "delivered"
    ).length;
    const delivered = channelLogs.filter((log) => log.status === "delivered").length;
    const converted = channelLogs.filter((log) => Boolean(log.conversion_at)).length;

    return {
      channel,
      label,
      sent,
      delivered,
      converted
    };
  };

  return [
    {
      channel: "email",
      label: "Email",
      sent: totals.sent,
      delivered: totals.delivered,
      converted: totals.clicked
    },
    buildOmnichannelRow("whatsapp", "WhatsApp"),
    buildOmnichannelRow("sms", "SMS")
  ];
}

function HealthMetric({
  label,
  value,
  total,
  tone
}: {
  label: string;
  value: number;
  total: number;
  tone: "emerald" | "rose" | "amber";
}) {
  const rate = getRate(value, total);
  const toneClass = {
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    amber: "bg-amber-500"
  }[tone];

  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs font-semibold text-slate-400">{formatPercent(rate)}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-normal text-slate-950">
        {value.toLocaleString()}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className={`h-full rounded-full ${toneClass}`} style={{ width: `${rate * 100}%` }} />
      </div>
    </div>
  );
}

function ChannelRow({
  row,
  deliveryRate,
  conversionRate
}: {
  row: ChannelPerformanceRow;
  deliveryRate: number;
  conversionRate: number;
}) {
  const Icon =
    row.channel === "email"
      ? MailCheck
      : row.channel === "whatsapp"
        ? MessageCircle
        : Smartphone;

  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-cyan-700" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-800">{row.label}</p>
        </div>
        <p className="text-xs text-slate-500">{row.sent.toLocaleString()} sent</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="font-semibold text-slate-700">
            {formatPercent(deliveryRate)}
          </p>
          <p className="mt-1 text-slate-500">送達率</p>
        </div>
        <div>
          <p className="font-semibold text-slate-700">
            {formatPercent(conversionRate)}
          </p>
          <p className="mt-1 text-slate-500">轉換率</p>
        </div>
      </div>
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
