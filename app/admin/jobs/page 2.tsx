"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Star, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Job } from "@/lib/types";

type Toast = {
  type: "success" | "error";
  message: string;
};

const statusLabels = {
  pending: "審核中",
  published: "已上架",
  rejected: "已退回"
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "發生未知錯誤，請稍後再試。";
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rejectingJob, setRejectingJob] = useState<Job | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((nextToast: Toast) => {
    setToast(nextToast);
  }, []);

  const fetchPendingJobs = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      showToast({
        type: "error",
        message: "尚未設定 Supabase 環境變數，無法讀取職缺。"
      });
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setJobs((data ?? []) as Job[]);
    } catch (error) {
      showToast({
        type: "error",
        message: `職缺讀取失敗：${getErrorMessage(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPendingJobs();
  }, [fetchPendingJobs]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);

    return () => window.clearTimeout(timer);
  }, [toast]);

  async function updateJob(
    jobId: string,
    update: Partial<Pick<Job, "status" | "is_featured" | "rejection_reason">>,
    successMessage: string
  ) {
    if (!supabase) {
      showToast({
        type: "error",
        message: "尚未設定 Supabase 環境變數，無法更新職缺。"
      });
      return;
    }

    try {
      setPendingId(jobId);

      const { error } = await supabase.from("jobs").update(update).eq("id", jobId);

      if (error) {
        throw error;
      }

      showToast({
        type: "success",
        message: successMessage
      });
      await fetchPendingJobs();
    } catch (error) {
      showToast({
        type: "error",
        message: `職缺更新失敗：${getErrorMessage(error)}`
      });
    } finally {
      setPendingId(null);
    }
  }

  async function approveJob(job: Job) {
    await updateJob(
      job.id,
      {
        status: "published",
        rejection_reason: null
      },
      "職缺已上架。"
    );
  }

  async function toggleFeatured(job: Job) {
    await updateJob(
      job.id,
      { is_featured: !job.is_featured },
      job.is_featured ? "已取消精選。" : "已設為精選。"
    );
  }

  async function rejectJob() {
    if (!rejectingJob) {
      return;
    }

    const reason = rejectionReason.trim();

    if (!reason) {
      showToast({
        type: "error",
        message: "請輸入退回理由。"
      });
      return;
    }

    const targetJob = rejectingJob;
    setRejectingJob(null);
    setRejectionReason("");

    await updateJob(
      targetJob.id,
      {
        status: "rejected",
        rejection_reason: reason
      },
      "職缺已退回。"
    );
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          className={`fixed bottom-5 right-5 z-[90] flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
          role="status"
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          {toast.message}
        </div>
      ) : null}

      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Job Review
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-gray-900">
            職缺審核系統
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            審核雇主送出的 pending 職缺，決定上架、退回或精選曝光。
          </p>
        </div>

        <button
          type="button"
          onClick={fetchPendingJobs}
          disabled={isLoading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          重新整理
        </button>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-4">職缺</th>
                <th className="px-6 py-4">公司</th>
                <th className="px-6 py-4">狀態</th>
                <th className="px-6 py-4">精選</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <LoadingRows />
              ) : (
                jobs.map((job) => {
                  const isPending = pendingId === job.id;

                  return (
                    <tr key={job.id} className="transition hover:bg-gray-50/80">
                      <td className="px-6 py-5">
                        <div className="font-semibold text-gray-900">{job.title}</div>
                        <p className="mt-1 line-clamp-2 max-w-xl text-xs leading-5 text-gray-500">
                          {job.description}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-gray-600">{job.company}</td>
                      <td className="px-6 py-5">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                          {statusLabels[job.status]}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => toggleFeatured(job)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition disabled:opacity-60 ${
                            job.is_featured
                              ? "bg-yellow-50 text-yellow-700 ring-yellow-100"
                              : "bg-gray-50 text-gray-600 ring-gray-200"
                          }`}
                        >
                          <Star className="h-3.5 w-3.5" aria-hidden="true" />
                          {job.is_featured ? "精選" : "一般"}
                        </button>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => approveJob(job)}
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isPending ? "處理中" : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => setRejectingJob(job)}
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && jobs.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-gray-500">
            目前沒有待審核職缺。
          </div>
        ) : null}
      </section>

      {rejectingJob ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-gray-950/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">退回職缺</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              請輸入退回理由，雇主可依此修改後重新送審。
            </p>
            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={4}
              className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              placeholder="例如：職缺描述不足，請補充薪資區間與遠端協作方式。"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingJob(null);
                  setRejectionReason("");
                }}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={rejectJob}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                確認退回
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <tr key={item} className="animate-pulse">
          <td className="px-6 py-5">
            <div className="h-4 w-48 rounded bg-gray-200" />
            <div className="mt-3 h-3 w-80 rounded bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="h-4 w-28 rounded bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="h-6 w-20 rounded-full bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="h-6 w-16 rounded-full bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="ml-auto h-9 w-36 rounded-lg bg-gray-100" />
          </td>
        </tr>
      ))}
    </>
  );
}
