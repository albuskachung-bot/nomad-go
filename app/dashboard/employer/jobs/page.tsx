"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bold,
  CheckCircle2,
  Heading3,
  HelpCircle,
  List,
  Loader2,
  Lock,
  Plus,
  Trash2,
  XCircle
} from "lucide-react";
import { publishJob } from "@/app/dashboard/employer/jobs/actions";
import EmployerPaywallModal from "@/components/billing/EmployerPaywallModal";
import { getEmployerWorkspaceContext } from "@/lib/employer-workspace";
import { supabase } from "@/lib/supabase/client";
import type { CompanyApprovalStatus, Job } from "@/lib/types";

type Toast = {
  type: "success" | "error";
  message: string;
};

type WorkspaceState = {
  companyId: string;
  employerId: string;
  companyName: string;
  approvalStatus: CompanyApprovalStatus;
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

const categoryOptions = [
  "軟體與系統工程 (Software & Engineering)",
  "產品與專案管理 (Product & Project Management)",
  "UI/UX 與視覺設計 (Design & UI/UX)",
  "數位行銷與公關 (Marketing & PR)",
  "內容與影音創作 (Content & Media)",
  "數據與人工智慧 (Data & AI)",
  "業務與商業開發 (Sales & BD)",
  "客戶成功與支援 (Customer Success & Support)",
  "人資與行政招募 (HR & Admin)",
  "財務與法務 (Finance & Legal)",
  "其他 (Other)"
];
const experienceLevelOptions = [
  "實習 (Intern)",
  "初階 (Junior)",
  "中階 (Mid-Level)",
  "資深 (Senior)",
  "主管 (Lead/Manager)"
];
const employmentTypeOptions = [
  "全職 (Full-time)",
  "兼職 (Part-time)",
  "約聘 (Contract)",
  "接案 (Freelance)"
];

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

function getPublishLockMessage(status: CompanyApprovalStatus | null | undefined) {
  if (status === "rejected") {
    return "您的入駐申請暫未通過審核，無法發布新職缺。";
  }

  if (status === "pending") {
    return "您的企業入駐申請正在審核中，核准後即可發布職缺。";
  }

  return "請先建立公司品牌資料並完成入駐審核後，再發布職缺。";
}

function getPublishButtonLabel(
  status: CompanyApprovalStatus | null | undefined,
  isLoading: boolean
) {
  if (isLoading) {
    return "確認審核狀態中";
  }

  if (status === "approved") {
    return "送出審核";
  }

  return "審核中無法發布";
}

export default function EmployerJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [screeningQuestions, setScreeningQuestions] = useState<string[]>([""]);
  const [workspace, setWorkspace] = useState<WorkspaceState>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const approvalStatus = workspace?.approvalStatus ?? null;
  const canPublishJobs = approvalStatus === "approved";

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
        approvalStatus: workspaceResult.context.company.approval_status ?? "pending",
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
    const form = event.currentTarget;

    const formData = new FormData(form);

    formData.delete("screening_questions");

    const cleanedScreeningQuestions = screeningQuestions
      .map((question) => question.trim())
      .filter(Boolean)
      .slice(0, 3);

    cleanedScreeningQuestions.forEach((question) => {
      formData.append("screening_questions", question);
    });

    try {
      setIsSubmitting(true);
      setToast(null);

      const result = await publishJob(formData);

      if (!result.ok) {
        if (result.reason === "job_limit_reached") {
          setIsPaywallOpen(true);
        }

        setToast({
          type: "error",
          message: result.message
        });
        return;
      }

      form.reset();
      setScreeningQuestions([""]);
      setToast({
        type: "success",
        message: result.message
      });
      await fetchJobs();
      router.refresh();
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

      <EmployerPaywallModal
        open={isPaywallOpen}
        variant="jobs"
        onClose={() => setIsPaywallOpen(false)}
      />

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
          {canPublishJobs ? (
            <Plus className="h-5 w-5 text-slate-700" aria-hidden="true" />
          ) : (
            <Lock className="h-5 w-5 text-amber-600" aria-hidden="true" />
          )}
          <h2 className="text-base font-semibold text-gray-900">發布新職缺</h2>
        </div>

        {!isLoading && !canPublishJobs ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{getPublishLockMessage(approvalStatus)}</p>
          </div>
        ) : null}

        <fieldset disabled={!canPublishJobs || isSubmitting} className="mt-5 grid gap-4 disabled:opacity-60 md:grid-cols-2">
          <Input name="title" label="職缺名稱" required />
          <Input name="company" label="公司名稱" defaultValue={workspace?.companyName ?? companyName} required />
          <Input name="location" label="地點 / 時區" placeholder="Remote / APAC" required />
          <Input name="salary_range" label="薪資區間" placeholder="USD 60k - 90k" />

          <SelectInput
            name="category"
            label="職務類別"
            options={categoryOptions}
            required
          />
          <SelectInput
            name="experience_level"
            label="資歷要求"
            options={experienceLevelOptions}
            required
          />
          <SelectInput
            name="employment_type"
            label="工作型態"
            options={employmentTypeOptions}
            required
          />
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-gray-900">技能標籤</span>
            <input
              name="tags"
              placeholder="React, TypeScript, SaaS"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
          </label>

          <MarkdownTextarea name="responsibilities" label="工作職責" required />
          <MarkdownTextarea name="requirements" label="必備條件" required />
          <MarkdownTextarea name="nice_to_haves" label="加分條件" />
          <MarkdownTextarea name="benefits" label="公司福利" />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <div className="flex items-start gap-3">
              <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-950">
                  自訂篩選問題
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  設定非同步面試問題（例如：請提供一段 1 分鐘的自我介紹影片連結，或簡述您最自豪的專案），幫助您快速篩選人才。
                </p>

                <div className="mt-4 space-y-3">
                  {screeningQuestions.map((question, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        value={question}
                        onChange={(event) =>
                          setScreeningQuestions((currentQuestions) =>
                            currentQuestions.map((item, itemIndex) =>
                              itemIndex === index ? event.target.value : item
                            )
                          )
                        }
                        placeholder={`篩選問題 ${index + 1}`}
                        maxLength={240}
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                      {screeningQuestions.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setScreeningQuestions((currentQuestions) =>
                              currentQuestions.filter((_, itemIndex) => itemIndex !== index)
                            )
                          }
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`刪除篩選問題 ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setScreeningQuestions((currentQuestions) =>
                      currentQuestions.length >= 3 ? currentQuestions : [...currentQuestions, ""]
                    )
                  }
                  disabled={screeningQuestions.length >= 3}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  新增問題
                </button>
                <span className="ml-3 text-xs font-medium text-slate-500">
                  最多 3 題
                </span>
              </div>
            </div>
          </div>
        </fieldset>

        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
          此職缺會使用平台內建一鍵投遞系統收件，不再需要外部應徵連結。
        </div>

        <button
          type="submit"
          disabled={!canPublishJobs || isSubmitting}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : canPublishJobs ? null : (
            <Lock className="h-4 w-4" aria-hidden="true" />
          )}
          {getPublishButtonLabel(approvalStatus, isLoading)}
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

function MarkdownTextarea({
  name,
  label,
  required
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertMarkdown(before: string, after = "", placeholder = "") {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.slice(start, end);
    const insertedText = selectedText
      ? `${before}${selectedText}${after}`
      : `${before}${placeholder}${after}`;

    textarea.setRangeText(insertedText, start, end, "end");
    textarea.focus();
  }

  function insertBulletList() {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.slice(start, end);
    const insertedText = selectedText
      ? selectedText
          .split("\n")
          .map((line) => (line.trim() ? `- ${line.replace(/^[-*•]\s+/, "")}` : line))
          .join("\n")
      : "- 請輸入項目";

    textarea.setRangeText(insertedText, start, end, "end");
    textarea.focus();
  }

  return (
    <label className="block md:col-span-2">
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <div className="mt-2 flex flex-wrap gap-2 rounded-t-lg border border-b-0 border-gray-200 bg-gray-50 px-3 py-2">
        <button
          type="button"
          onClick={() => insertMarkdown("### ", "", "小標題")}
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-100"
        >
          <Heading3 className="h-3.5 w-3.5" aria-hidden="true" />
          H3
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("**", "**", "重點文字")}
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-100"
        >
          <Bold className="h-3.5 w-3.5" aria-hidden="true" />
          粗體
        </button>
        <button
          type="button"
          onClick={insertBulletList}
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-100"
        >
          <List className="h-3.5 w-3.5" aria-hidden="true" />
          項目符號
        </button>
      </div>
      <textarea
        ref={textareaRef}
        name={name}
        required={required}
        rows={6}
        placeholder="可使用 Markdown，例如：### 小標題、**重點文字**、- 項目符號"
        className="w-full rounded-b-lg border border-gray-200 px-3 py-2 text-sm outline-none transition placeholder:text-gray-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
      />
      <span className="mt-2 block text-xs leading-5 text-gray-500">
        支援 Markdown：H3 小標題、粗體與項目符號會在前台自動套用排版。
      </span>
    </label>
  );
}

function SelectInput({
  name,
  label,
  options,
  required
}: {
  name: string;
  label: string;
  options: string[];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <select
        name={name}
        required={required}
        defaultValue={options[0]}
        className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
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
