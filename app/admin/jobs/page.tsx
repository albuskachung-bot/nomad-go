import { CircleAlert, Database, Sparkles } from "lucide-react";
import AdminJobReviewActions from "@/components/admin/AdminJobReviewActions";
import { mockJobs } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContentStatus, Job } from "@/lib/types";

type InventoryResult = {
  jobs: Job[];
  usingMockData: boolean;
  notice: string | null;
};

const publicationLabels: Record<ContentStatus, string> = {
  pending: "待發布",
  published: "營運中",
  rejected: "已退回"
};

const publicationStyles: Record<ContentStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200"
};

function formatDate(value: string) {
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

async function getJobInventory(): Promise<InventoryResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      jobs: mockJobs,
      usingMockData: true,
      notice: "尚未連線至資料庫，以下顯示 inventory 示範資料。"
    };
  }

  try {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return {
      jobs: data ?? [],
      usingMockData: false,
      notice: null
    };
  } catch (error) {
    console.error("[admin/jobs] Unable to load job inventory; rendering fallback.", error);

    return {
      jobs: mockJobs,
      usingMockData: true,
      notice: "職缺資料來源暫時無法使用，已切換至示範資料以維持操作介面。"
    };
  }
}

export default async function AdminJobsInventoryPage() {
  const { jobs, usingMockData, notice } = await getJobInventory();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Jobs Inventory
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            職缺資料庫
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            檢視平台職缺上架情形，並預留未來 AI 自動審核工作流的任務入口。
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          <Database className="h-3.5 w-3.5" aria-hidden="true" />
          {usingMockData ? "Mock inventory" : "Live inventory"}
        </span>
      </section>

      {notice ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{notice}</p>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="font-semibold text-slate-900">所有職缺</h2>
          <p className="mt-1 text-xs text-slate-500">
            AI 審核為預留功能，按鈕將於模型與人工覆核策略完成後啟用。
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">職缺名稱</th>
                <th className="px-6 py-4">企業 / 地點</th>
                <th className="px-6 py-4">上架狀態</th>
                <th className="px-6 py-4">審核狀態</th>
                <th className="px-6 py-4">建立日期</th>
                <th className="px-6 py-4 text-right">審核操作 (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.id} className="transition hover:bg-slate-50/70">
                  <td className="px-6 py-5">
                    <p className="font-semibold text-slate-900">{job.title || "未命名職缺"}</p>
                    <p className="mt-1 text-xs text-slate-500">{job.job_type || "未指定型態"}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-medium text-slate-700">{job.company || "未命名企業"}</p>
                    <p className="mt-1 text-xs text-slate-500">{job.location || "未提供地點"}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                        publicationStyles[job.status] ?? publicationStyles.pending
                      }`}
                    >
                      {publicationLabels[job.status] ?? "待確認"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      等待審核 (Pending Review)
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-5 text-slate-500">
                    {formatDate(job.created_at)}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <AdminJobReviewActions
                      jobId={job.id}
                      status={job.status}
                      disabled={usingMockData}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {jobs.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-700">目前沒有職缺資料。</p>
            <p className="mt-2 text-xs text-slate-500">新職缺建立後會在此進入審核佇列。</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
