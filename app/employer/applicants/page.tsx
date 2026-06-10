"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  FileText,
  HelpCircle,
  Loader2,
  LockKeyhole,
  Mail,
  StickyNote,
  UnlockKeyhole,
  UserRound,
  X,
  XCircle
} from "lucide-react";
import {
  unlockApplicant,
  updateEmployerApplicationReview
} from "@/app/employer/applicants/actions";
import EmployerPaywallModal from "@/app/employer/components/EmployerPaywallModal";
import { getEmployerWorkspaceContext } from "@/lib/employer-workspace";
import { supabase } from "@/lib/supabase/client";
import type {
  Application,
  ApplicationStatus,
  CompanyApplicationWithNotes,
  Job,
  Profile
} from "@/lib/types";

type ApplicantRow = {
  application: Application;
  job: Job;
  profile: Profile | null;
  applicantEmail: string | null;
  contactUnlocked: boolean;
  companyName: string;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const applicationStatuses: Array<{
  value: ApplicationStatus;
  label: string;
  className: string;
}> = [
  {
    value: "pending",
    label: "待審查",
    className: "bg-slate-100 text-slate-700 ring-slate-200"
  },
  {
    value: "reviewed",
    label: "已審閱",
    className: "bg-blue-50 text-blue-700 ring-blue-100"
  },
  {
    value: "interview",
    label: "面試中",
    className: "bg-amber-50 text-amber-700 ring-amber-100"
  },
  {
    value: "hired",
    label: "已錄取",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-100"
  },
  {
    value: "rejected",
    label: "婉拒",
    className: "bg-rose-50 text-rose-700 ring-rose-100"
  }
];

const statusMeta = Object.fromEntries(
  applicationStatuses.map((status) => [status.value, status])
) as Record<ApplicationStatus, (typeof applicationStatuses)[number]>;

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

function isMissingDataSourceError(error: unknown) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    code === "PGRST116" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    code === "42P01" ||
    code === "42703" ||
    message.includes("could not find the table") ||
    (message.includes("column") && message.includes("does not exist")) ||
    (message.includes("function") && message.includes("does not exist")) ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

function getInitial(row: ApplicantRow) {
  return (row.profile?.full_name ?? row.application.user_id).slice(0, 1).toUpperCase();
}

function getScreeningAnswerPairs(row: ApplicantRow) {
  const questions = (row.job.screening_questions ?? [])
    .map((question) => question.trim())
    .filter(Boolean);
  const answers = Array.isArray(row.application.screening_answers)
    ? row.application.screening_answers
    : [];

  if (answers.length > 0) {
    return answers.map((item, index) => ({
      question: item.question?.trim() || questions[index] || `篩選問題 ${index + 1}`,
      answer: item.answer?.trim() || "求職者未作答。"
    }));
  }

  return questions.map((question) => ({
    question,
    answer: "此應徵紀錄尚未提供回答。"
  }));
}

function ApplicantEmailCell({
  row,
  isPending,
  onUnlock
}: {
  row: ApplicantRow;
  isPending: boolean;
  onUnlock: () => void;
}) {
  if (row.contactUnlocked) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <Mail className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        {row.applicantEmail ?? "Email unavailable"}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex min-w-[150px] items-center gap-1.5 text-sm font-medium text-slate-500">
        <LockKeyhole className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <span className="select-none blur-sm">talent@example.com</span>
      </span>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onUnlock();
        }}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <UnlockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        解鎖
      </button>
    </div>
  );
}

function ApplicantEmailInline({
  row,
  isPending,
  onUnlock
}: {
  row: ApplicantRow;
  isPending: boolean;
  onUnlock: () => void;
}) {
  if (row.contactUnlocked) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Mail className="h-4 w-4" aria-hidden="true" />
        {row.applicantEmail ?? "Email unavailable"}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5">
        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        <span className="select-none blur-sm">talent@example.com</span>
      </span>
      <button
        type="button"
        onClick={onUnlock}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <UnlockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        解鎖聯絡方式
      </button>
    </span>
  );
}

export default function EmployerApplicantsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ApplicantRow[]>([]);
  const [activeStatus, setActiveStatus] = useState<ApplicationStatus>("pending");
  const [selectedRow, setSelectedRow] = useState<ApplicantRow | null>(null);
  const [draftStatus, setDraftStatus] = useState<ApplicationStatus>("pending");
  const [draftNotes, setDraftNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const fetchApplicants = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      setToast({
        type: "error",
        message: "尚未設定 Supabase 環境變數，無法讀取應徵者。"
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
        setRows([]);
        return;
      }

      let jobsResult = await supabase
        .from("jobs")
        .select("*")
        .eq("company_id", workspaceResult.context.company.id);

      if (
        jobsResult.error &&
        isMissingDataSourceError(jobsResult.error) &&
        workspaceResult.context.isOwner
      ) {
        jobsResult = await supabase
          .from("jobs")
          .select("*")
          .eq("employer_id", user.id);
      }

      if (jobsResult.error) {
        if (isMissingDataSourceError(jobsResult.error)) {
          console.warn("[employer-applicants] jobs table is unavailable; showing empty state", jobsResult.error);
          setRows([]);
          return;
        }

        throw jobsResult.error;
      }

      const typedJobs = (jobsResult.data ?? []) as Job[];
      const jobIds = typedJobs.map((job) => job.id);

      if (jobIds.length === 0) {
        setRows([]);
        return;
      }

      let typedApplications: CompanyApplicationWithNotes[] = [];
      const notesResult = await supabase.rpc("get_company_applications_with_notes", {
        target_company_id: workspaceResult.context.company.id
      });

      if (notesResult.error) {
        if (!isMissingDataSourceError(notesResult.error)) {
          throw notesResult.error;
        }

        console.warn(
          "[employer-applicants] internal notes RPC is unavailable; falling back without notes",
          notesResult.error
        );

        const { data: applications, error: applicationsError } = await supabase
          .from("applications")
          .select("id,user_id,job_id,status,resume_url,cover_letter,screening_answers,applied_at")
          .in("job_id", jobIds)
          .order("applied_at", { ascending: false });

        if (applicationsError) {
          throw applicationsError;
        }

        typedApplications = ((applications ?? []) as Omit<Application, "internal_notes">[]).map((application) => ({
          ...application,
          internal_notes: null,
          applicant_email: null
        }));
      } else {
        typedApplications = (notesResult.data ?? []) as CompanyApplicationWithNotes[];
      }

      const applicantIds = Array.from(new Set(typedApplications.map((item) => item.user_id)));
      const { data: profiles, error: profilesError } = applicantIds.length
        ? await supabase.from("profiles").select("*").in("id", applicantIds)
        : { data: [], error: null };

      if (profilesError) {
        if (isMissingDataSourceError(profilesError)) {
          console.warn(
            "[employer-applicants] profiles lookup is unavailable; showing applicants without profile details",
            profilesError
          );
        } else {
          throw profilesError;
        }
      }

      const jobsById = new Map(typedJobs.map((job) => [job.id, job]));
      const profilesById = new Map(((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile]));
      const workspaceCompanyName = workspaceResult.context.company.name;

      setRows(
        typedApplications
          .map<ApplicantRow | null>((application) => {
            const job = jobsById.get(application.job_id);

            if (!job) {
              return null;
            }

            return {
              application,
              job,
              profile: profilesById.get(application.user_id) ?? null,
              applicantEmail: application.contact_unlocked ? application.applicant_email ?? null : null,
              contactUnlocked: Boolean(application.contact_unlocked),
              companyName: workspaceCompanyName ?? job.company ?? "未命名公司"
            };
          })
          .filter((row): row is ApplicantRow => row !== null)
      );
    } catch (error) {
      setToast({
        type: "error",
        message: `應徵者讀取失敗：${getErrorMessage(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!selectedRow) {
      return;
    }

    setDraftStatus(selectedRow.application.status);
    setDraftNotes(selectedRow.application.internal_notes ?? "");
  }, [selectedRow]);

  const statusCounts = useMemo(() => {
    return applicationStatuses.reduce<Record<ApplicationStatus, number>>((accumulator, status) => {
      accumulator[status.value] = rows.filter((row) => row.application.status === status.value).length;
      return accumulator;
    }, {
      pending: 0,
      reviewed: 0,
      interview: 0,
      rejected: 0,
      hired: 0
    });
  }, [rows]);

  const filteredRows = useMemo(
    () => rows.filter((row) => row.application.status === activeStatus),
    [activeStatus, rows]
  );

  async function handlePreviewResume(application: Application) {
    if (!supabase) {
      setToast({
        type: "error",
        message: "尚未設定 Supabase 環境變數，無法讀取履歷。"
      });
      return;
    }

    if (!application.resume_url || application.resume_url.startsWith("legacy/")) {
      setToast({
        type: "error",
        message: "此應徵紀錄尚未提供平台履歷。"
      });
      return;
    }

    try {
      setPendingKey(`resume:${application.id}`);
      const { data, error } = await supabase.storage
        .from("resumes")
        .createSignedUrl(application.resume_url, 10 * 60);

      if (error || !data?.signedUrl) {
        throw error ?? new Error("無法產生履歷預覽連結。");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setToast({
        type: "error",
        message: `履歷讀取失敗：${getErrorMessage(error)}`
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleUnlockApplicant(row: ApplicantRow) {
    setPendingKey(`unlock:${row.application.id}`);
    setToast(null);

    const formData = new FormData();
    formData.set("application_id", row.application.id);

    const result = await unlockApplicant(formData);

    setPendingKey(null);

    if (!result.ok) {
      if (result.reason === "unlock_limit_reached") {
        setIsPaywallOpen(true);
      }

      setToast({
        type: "error",
        message: result.message
      });
      return;
    }

    const updatedRow: ApplicantRow = {
      ...row,
      applicantEmail: result.applicantEmail,
      contactUnlocked: true
    };

    setRows((currentRows) =>
      currentRows.map((currentRow) =>
        currentRow.application.id === row.application.id ? updatedRow : currentRow
      )
    );

    setSelectedRow((currentSelectedRow) =>
      currentSelectedRow?.application.id === row.application.id ? updatedRow : currentSelectedRow
    );

    setToast({
      type: "success",
      message: result.message
    });
    router.refresh();
  }

  async function handleReviewSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRow) {
      return;
    }

    setPendingKey(`review:${selectedRow.application.id}`);
    setToast(null);

    const formData = new FormData();
    formData.set("application_id", selectedRow.application.id);
    formData.set("status", draftStatus);
    formData.set("internal_notes", draftNotes);

    const result = await updateEmployerApplicationReview(formData);

    setPendingKey(null);
    setToast({
      type: result.ok ? "success" : "error",
      message: result.ok ? "應徵狀態與內部註記已更新。" : result.message
    });

    if (result.ok) {
      const updatedRow: ApplicantRow = {
        ...selectedRow,
        application: {
          ...selectedRow.application,
          status: draftStatus,
          internal_notes: draftNotes.trim() || null
        }
      };

      setSelectedRow(updatedRow);
      setRows((currentRows) =>
        currentRows.map((row) => (row.application.id === updatedRow.application.id ? updatedRow : row))
      );
      await fetchApplicants();
      router.refresh();
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
        variant="applicants"
        onClose={() => setIsPaywallOpen(false)}
      />

      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Applicant Tracking System
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-900">應徵者管理</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            依照招募狀態篩選應徵者，在履歷詳細視窗中管理內部註記與後續流程。
          </p>
        </div>
        <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200">
          {rows.length} 位應徵紀錄
        </div>
      </section>

      <section className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-gray-200">
        <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="應徵狀態篩選">
          {applicationStatuses.map((status) => {
            const selected = activeStatus === status.value;

            return (
              <button
                key={status.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveStatus(status.value)}
                className={`inline-flex min-w-max items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  selected
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {status.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    selected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {statusCounts[status.value]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-4">人才</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">應徵職缺</th>
                <th className="px-6 py-4">狀態</th>
                <th className="px-6 py-4">投遞時間</th>
                <th className="px-6 py-4">內部註記</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <LoadingRows />
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.application.id}
                    tabIndex={0}
                    onClick={() => setSelectedRow(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedRow(row);
                      }
                    }}
                    className="cursor-pointer transition hover:bg-gray-50/80 focus:bg-gray-50 focus:outline-none"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                          {getInitial(row)}
                        </span>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {row.profile?.full_name ?? "未命名人才"}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {row.profile?.title ?? row.profile?.location ?? row.application.user_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <ApplicantEmailCell
                        row={row}
                        isPending={pendingKey === `unlock:${row.application.id}`}
                        onUnlock={() => handleUnlockApplicant(row)}
                      />
                    </td>
                    <td className="px-6 py-5 text-gray-600">{row.job.title}</td>
                    <td className="px-6 py-5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                          statusMeta[row.application.status]?.className ?? statusMeta.pending.className
                        }`}
                      >
                        {statusMeta[row.application.status]?.label ?? row.application.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-gray-500">
                      {new Intl.DateTimeFormat("zh-TW").format(new Date(row.application.applied_at))}
                    </td>
                    <td className="max-w-xs px-6 py-5 text-gray-500">
                      {row.application.internal_notes ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                          <StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
                          已註記
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">尚無註記</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredRows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <UserRound className="mx-auto h-10 w-10 text-gray-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-gray-600">
              目前沒有「{statusMeta[activeStatus].label}」的應徵紀錄。
            </p>
          </div>
        ) : null}
      </section>

      {selectedRow ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            aria-label="關閉履歷詳細資訊"
            onClick={() => setSelectedRow(null)}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="applicant-modal-title"
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg font-semibold text-white">
                  {getInitial(selectedRow)}
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Applicant Detail
                  </p>
                  <h2 id="applicant-modal-title" className="mt-1 text-2xl font-semibold text-slate-950">
                    {selectedRow.profile?.full_name ?? "未命名人才"}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                      {selectedRow.job.title}
                    </span>
                    <ApplicantEmailInline
                      row={selectedRow}
                      isPending={pendingKey === `unlock:${selectedRow.application.id}`}
                      onUnlock={() => handleUnlockApplicant(selectedRow)}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="關閉"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <InfoCard label="目前狀態" value={statusMeta[selectedRow.application.status].label} />
              <InfoCard
                label="投遞時間"
                value={new Intl.DateTimeFormat("zh-TW", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit"
                }).format(new Date(selectedRow.application.applied_at))}
              />
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">完整 Cover Letter</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                {selectedRow.application.cover_letter || "求職者未填寫自我推薦信。"}
              </p>
            </div>

            {getScreeningAnswerPairs(selectedRow).length > 0 ? (
              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-blue-700" aria-hidden="true" />
                  <p className="text-sm font-semibold text-blue-950">
                    非同步面試回答
                  </p>
                </div>
                <div className="mt-4 space-y-4">
                  {getScreeningAnswerPairs(selectedRow).map((item, index) => (
                    <div key={`${item.question}-${index}`} className="rounded-lg bg-white p-4 ring-1 ring-blue-100">
                      <p className="text-sm font-semibold leading-6 text-slate-950">
                        {index + 1}. {item.question}
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handlePreviewResume(selectedRow.application)}
                disabled={pendingKey === `resume:${selectedRow.application.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
              >
                {pendingKey === `resume:${selectedRow.application.id}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="h-4 w-4" aria-hidden="true" />
                )}
                下載 / 預覽履歷
              </button>
              <Link
                href={`/employer/applicants/${selectedRow.application.user_id}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                查看人才檔案
              </Link>
              <Link
                href={`/employer/messages?application_id=${selectedRow.application.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                發送站內信
              </Link>
            </div>

            <form onSubmit={handleReviewSave} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-900">應徵狀態</span>
                <select
                  value={draftStatus}
                  onChange={(event) => setDraftStatus(event.target.value as ApplicationStatus)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                >
                  {applicationStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-900">內部註記</span>
                <textarea
                  value={draftNotes}
                  onChange={(event) => setDraftNotes(event.target.value)}
                  rows={5}
                  placeholder="只有公司團隊成員可以讀取這段註記，求職者不會看到。"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </label>

              <button
                type="submit"
                disabled={pendingKey === `review:${selectedRow.application.id}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
              >
                {pendingKey === `review:${selectedRow.application.id}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                )}
                儲存註記與狀態
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <tr key={row} className="animate-pulse">
          <td className="px-6 py-5">
            <div className="h-4 w-40 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-28 rounded bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="h-4 w-44 rounded bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="h-4 w-36 rounded bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="h-6 w-20 rounded-full bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="h-4 w-24 rounded bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="h-4 w-20 rounded bg-gray-100" />
          </td>
        </tr>
      ))}
    </>
  );
}
