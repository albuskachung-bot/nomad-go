import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Blocks,
  CalendarClock,
  CircleAlert,
  Mail,
  PenLine,
  Play,
  Plus,
  Send,
  ShieldCheck,
  Workflow
} from "lucide-react";
import { dispatchCampaignFromForm } from "@/app/actions/edm";
import { getCurrentAdminContext } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EdmCampaign, EdmCampaignStatus } from "@/lib/types";

type AdminEdmPageProps = {
  searchParams?: Promise<{
    notice?: string;
    error?: string;
  }>;
};

type CampaignsResult = {
  campaigns: EdmCampaign[];
  error: string | null;
};

const statusMeta: Record<
  EdmCampaignStatus,
  {
    label: string;
    className: string;
  }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 ring-slate-200"
  },
  scheduled: {
    label: "Scheduled",
    className: "bg-cyan-50 text-cyan-700 ring-cyan-100"
  },
  sending: {
    label: "Sending",
    className: "bg-amber-50 text-amber-700 ring-amber-100"
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-100"
  },
  waiting_for_ab_result: {
    label: "Waiting A/B",
    className: "bg-violet-50 text-violet-700 ring-violet-100"
  }
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeStatus(value: string | null | undefined): EdmCampaignStatus {
  if (
    value === "scheduled" ||
    value === "sending" ||
    value === "waiting_for_ab_result" ||
    value === "completed"
  ) {
    return value;
  }

  return "draft";
}

function formatDateTime(value: string | null | undefined) {
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
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsedDate);
}

function getAudienceLabel(campaign: EdmCampaign) {
  const audience = campaign.target_segment?.audience;

  if (audience === "paid") {
    return "Pro/VIP 付費會員";
  }

  if (audience === "free") {
    return "Free 免費會員";
  }

  return "所有會員";
}

async function getCampaigns(): Promise<CampaignsResult> {
  const context = await getCurrentAdminContext();

  if (!context.supabase || !context.user) {
    redirect("/admin/login");
  }

  if (!context.isSuperAdmin && context.profile?.role !== "super_admin") {
    redirect("/admin");
  }

  const supabase = createSupabaseAdminClient() ?? context.supabase;
  const { data, error } = await supabase
    .from("edm_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      campaigns: [],
      error: error.message
    };
  }

  return {
    campaigns: (data ?? []) as EdmCampaign[],
    error: null
  };
}

export default async function AdminEdmPage({ searchParams }: AdminEdmPageProps) {
  const query = await searchParams;
  const { campaigns, error } = await getCampaigns();
  const notice = query?.notice?.trim() || null;
  const actionError =
    query?.error === "missing-campaign"
      ? "缺少 EDM 任務 ID。"
      : query?.error?.trim() || null;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            EDM Campaigns
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            EDM 電子報
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            管理自建名單篩選、HTML 內容與第三方發信 API 串接前的 Campaign 工作流。
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/edm/analytics"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            成效看板
          </Link>
          <Link
            href="/admin/edm/dynamic-blocks"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Blocks className="h-4 w-4" aria-hidden="true" />
            動態區塊
          </Link>
          <Link
            href="/admin/edm/automations"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-800 transition hover:bg-violet-100"
          >
            <Workflow className="h-4 w-4" aria-hidden="true" />
            自動化腳本
          </Link>
          <Link
            href="/admin/settings/integrations"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-100 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            整合設定
          </Link>
          <Link
            href="/admin/edm/create"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            新增 EDM
          </Link>
        </div>
      </section>

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {actionError}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">EDM 任務讀取失敗。</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-5">
        {(
          [
            "draft",
            "scheduled",
            "sending",
            "waiting_for_ab_result",
            "completed"
          ] as EdmCampaignStatus[]
        ).map((status) => {
          const meta = statusMeta[status];
          const count = campaigns.filter(
            (campaign) => normalizeStatus(campaign.status) === status
          ).length;

          return (
            <article
              key={status}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${meta.className}`}>
                {meta.label}
              </span>
              <p className="mt-5 text-3xl font-semibold tracking-normal text-slate-950">
                {count}
              </p>
              <p className="mt-2 text-sm text-slate-500">個 Campaign</p>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
            <Mail className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Campaign 列表</h2>
            <p className="text-xs text-slate-500">
              Phase 1 dispatch 僅使用 console.log 模擬寄送。
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">活動名稱</th>
                <th className="px-6 py-4">狀態</th>
                <th className="px-6 py-4">目標客群</th>
                <th className="px-6 py-4">預計發送</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((campaign) => {
                const status = normalizeStatus(campaign.status);
                const meta = statusMeta[status];

                return (
                  <tr key={campaign.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-5">
                      <Link
                        href={`/admin/edm/create?id=${campaign.id}`}
                        className="font-semibold text-slate-900 hover:text-cyan-700"
                      >
                        {campaign.name}
                      </Link>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {campaign.is_ab_test
                          ? `${campaign.variant_a_subject ?? campaign.subject} / ${
                              campaign.variant_b_subject ?? "主旨 B 未設定"
                            }`
                          : campaign.subject}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${meta.className}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <Send className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        {getAudienceLabel(campaign)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        {formatDateTime(campaign.scheduled_at)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/edm/create?id=${campaign.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                          編輯
                        </Link>
                        <form action={dispatchCampaignFromForm}>
                          <input type="hidden" name="campaign_id" value={campaign.id} />
                          <button
                            type="submit"
                            disabled={
                              status === "sending" || status === "waiting_for_ab_result"
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Play className="h-3.5 w-3.5" aria-hidden="true" />
                            模擬發送
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {campaigns.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">尚無 EDM 任務</p>
            <p className="mt-2 text-sm text-slate-500">
              建立第一個 Campaign 後，任務狀態與發送時間會顯示在這裡。
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
