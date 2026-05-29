"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Plus, XCircle } from "lucide-react";
import { getEmployerWorkspaceContext } from "@/lib/employer-workspace";
import { supabase } from "@/lib/supabase/client";
import type { Job } from "@/lib/types";

type Toast = {
  type: "success" | "error";
  message: string;
};

type WorkspaceState = {
  companyId: string;
  employerId: string;
  companyName: string;
  isOwner: boolean;
} | null;

const statusStyles = {
  pending: "bg-amber-50 text-amber-700 ring-amber-100",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  rejected: "bg-rose-50 text-rose-700 ring-rose-100"
};

const statusLabels = {
  pending: "審核中",
  published: "已發布",
  rejected: "已退回"
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return "發生未知錯誤，請稍後再試。";
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }

  return null;
}

function isSchemaNotReadyError(error: unknown) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    code === "PGRST116" ||
    code === "PGRST205" ||
    code === "42P01" ||
    code === "42703" ||
    message.includes("could not find the table") ||
    message.includes("column") && message.includes("does not exist") ||
    message.includes("relation") && message.includes("does not exist")
  );
}

export default function EmployerJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceState>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      setToast({
        type: "error",
        message: "尚未設定 Supabase 環境變數，無法讀取職缺。"
      });
      return;
    }

    try {
      setIsLoading(true);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error("尚未登入。");
      }

      const workspaceResult = await getEmployerWorkspaceContext(supabase, user.id);

      if (workspaceResult.error) {
        throw new Error(workspaceResult.error);
      }

      if (!workspaceResult.context?.company) {
        setJobs([]);
        setCompanyName("");
        setWorkspace(null);
        return;
      }

      const currentWorkspace = {
        companyId: workspaceResult.context.company.id,
        employerId: workspaceResult.context.company.employer_id,
        companyName: workspaceResult.context.company.name,
        isOwner: workspaceResult.context.isOwner
      };
      setWorkspace(currentWorkspace);
      setCompanyName(currentWorkspace.companyName);

      let jobsResult = await supabase
        .from("jobs")
        .select("*")
        .eq("company_id", currentWorkspace.companyId)
        .order("created_at", { ascending: false });

      if (jobsResult.error && isSchemaNotReadyError(jobsResult.error) && currentWorkspace.isOwner) {
        jobsResult = await supabase
          .from("jobs")
          .select("*")
          .eq("employer_id", user.id)
          .order("created_at", { ascending: false });
      }

      if (jobsResult.error) {
        if (isSchemaNotReadyError(jobsResult.error)) {
          console.warn("[employer-jobs] jobs schema is not ready; showing empty state", jobsResult.error);
          setJobs([]);
          return;
        }

        throw jobsResult.error;
      }

      setJobs((jobsResult.data ?? []) as Job[]);
    } catch (error) {
      setToast({
        type: "error",
        message: `職缺讀取失敗：${getErrorMessage(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setToast({
        type: "error",
        message: "尚未設定 Supabase 環境變數，無法新增職缺。"
      });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const tags = formData
      .get("tags")
      ?.toString()
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean) ?? [];

    try {
      setIsSubmitting(true);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error("尚未登入。");
      }

      const workspaceResult = await getEmployerWorkspaceContext(supabase, user.id);

      if (workspaceResult.error) {
        throw new Error(workspaceResult.error);
      }

      if (!workspaceResult.context?.company) {
        throw new Error("請先建立公司品牌資料，再新增職缺。");
      }

      const currentCompany = workspaceResult.context.company;
      const { error } = await supabase.from("jobs").insert({
        employer_id: currentCompany.employer_id,
        company_id: currentCompany.id,
        title: formData.get("title")?.toString().trim() ?? "",
        company: formData.get("company")?.toString().trim() || currentCompany.name || "未命名公司",
        location: formData.get("location")?.toString().trim() ?? "",
        job_type: formData.get("job_type")?.toString().trim() ?? "",
        salary_range: formData.get("salary_range")?.toString().trim() || null,
        tags,
        description: formData.get("description")?.toString().trim() ?? "",
        apply_url: formData.get("apply_url")?.toString().trim() || null,
        is_featured: false,
        rejection_reason: null,
        status: "pending"
      });

      if (error) {
        if (isSchemaNotReadyError(error)) {
          throw new Error("資料庫結構尚未更新，請先執行 Supabase company workspace schema。");
        }

        throw error;
      }

      event.currentTarget.reset();
      setToast({
        type: "success",
        message: "職缺已送出審核。"
      });
      await fetchJobs();
    } catch (error) {
      setToast({
        type: "error",
        message: `職缺新增失敗：${getErrorMessage(error)}`
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          className={`fixed bottom-5 right-5 z-[90] flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5" aria-hidden="true" />
          )}
          {toast.message}
        </div>
      ) : null}

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Job Management
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">招募管理</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          新增職缺後會進入審核中，營運團隊核准後才會顯示在前台。
        </p>
      </section>

      <form
        key={workspace?.companyId ?? "new-job-form"}
        onSubmit={handleSubmit}
        className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
          <Plus className="h-5 w-5 text-slate-700" aria-hidden="true" />
          <h2 className="text-base font-semibold text-gray-900">發布新職缺</h2>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Input name="title" label="職缺名稱" required />
          <Input name="company" label="公司名稱" defaultValue={workspace?.companyName ?? companyName} required />
          <Input name="location" label="地點 / 時區" placeholder="Remote / APAC" required />
          <Input name="job_type" label="工作型態" placeholder="全職遠端" required />
          <Input name="salary_range" label="薪資區間" placeholder="USD 60k - 90k" />
          <Input name="apply_url" label="應徵連結" placeholder="https://..." />
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-gray-900">技能標籤</span>
            <input
              name="tags"
              placeholder="React, TypeScript, SaaS"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-gray-900">職缺描述</span>
            <textarea
              name="description"
              required
              rows={5}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          送出審核
        </button>
      </form>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">我的職缺</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-3">職缺</th>
                <th className="px-6 py-3">地點</th>
                <th className="px-6 py-3">狀態</th>
                <th className="px-6 py-3">退回理由</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <LoadingRows />
              ) : (
                jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{job.title}</div>
                      <div className="mt-1 text-xs text-gray-500">{job.company}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{job.location}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyles[job.status]}`}>
                        {statusLabels[job.status]}
                      </span>
                    </td>
                    <td className="max-w-sm px-6 py-4 text-gray-500">
                      {job.rejection_reason ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && jobs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            尚未發布任何職缺。
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Input({
  name,
  label,
  required,
  placeholder,
  defaultValue
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  );
}

function LoadingRows() {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <tr key={row} className="animate-pulse">
          <td className="px-6 py-4">
            <div className="h-4 w-44 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-24 rounded bg-gray-100" />
          </td>
          <td className="px-6 py-4">
            <div className="h-4 w-28 rounded bg-gray-100" />
          </td>
          <td className="px-6 py-4">
            <div className="h-6 w-20 rounded-full bg-gray-100" />
          </td>
          <td className="px-6 py-4">
            <div className="h-4 w-60 rounded bg-gray-100" />
          </td>
        </tr>
      ))}
    </>
  );
}
