"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, FileText, Loader2, Send, UploadCloud, X, XCircle } from "lucide-react";
import { createApplication } from "@/app/actions/hiring";
import { supabase } from "@/lib/supabase/client";

type JobApplyModalProps = {
  jobId: string;
  jobTitle: string;
  companyName: string;
  screeningQuestions?: string[] | null;
  buttonClassName?: string;
};

type Toast = {
  type: "success" | "error";
  message: string;
} | null;

const maxResumeSize = 5 * 1024 * 1024;

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

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export default function JobApplyModal({
  jobId,
  jobTitle,
  companyName,
  screeningQuestions = [],
  buttonClassName = "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
}: JobApplyModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const activeScreeningQuestions = (screeningQuestions ?? [])
    .map((question) => question.trim())
    .filter(Boolean)
    .slice(0, 3);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function closeModal() {
    if (!isSubmitting) {
      setIsOpen(false);
      setResumeFile(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!supabase) {
      setToast({
        type: "error",
        message: "尚未設定 Supabase 環境變數，無法送出應徵。"
      });
      return;
    }

    if (!resumeFile) {
      setToast({
        type: "error",
        message: "請上傳 PDF 履歷。"
      });
      return;
    }

    if (!isPdf(resumeFile)) {
      setToast({
        type: "error",
        message: "履歷格式限 PDF。"
      });
      return;
    }

    if (resumeFile.size > maxResumeSize) {
      setToast({
        type: "error",
        message: "履歷檔案不可超過 5MB。"
      });
      return;
    }

    const formData = new FormData(form);
    const screeningAnswers = activeScreeningQuestions.map((question, index) => ({
      question,
      answer: formData.get(`screening_answer_${index}`)?.toString().trim() ?? ""
    }));

    if (screeningAnswers.some((item) => item.answer.length === 0)) {
      setToast({
        type: "error",
        message: "請完整回答所有篩選問題後再送出。"
      });
      return;
    }

    let uploadedPath: string | null = null;

    try {
      setIsSubmitting(true);
      setToast(null);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error("請先登入或註冊後再投遞。");
      }

      const filePath = `${user.id}/${jobId}-${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, resumeFile, {
          contentType: "application/pdf",
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      uploadedPath = filePath;

      const result = await createApplication(jobId, user.id, {
        resumeUrl: filePath,
        coverLetter: formData.get("cover_letter")?.toString().trim() || null,
        screeningAnswers
      });

      form.reset();
      setResumeFile(null);
      setIsOpen(false);
      setToast({
        type: "success",
        message: result.message
      });
    } catch (error) {
      if (uploadedPath && supabase) {
        await supabase.storage.from("resumes").remove([uploadedPath]);
      }

      setToast({
        type: "error",
        message: `應徵送出失敗：${getErrorMessage(error)}`
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClassName}
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        立即應徵
      </button>

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
          <span>{toast.message}</span>
        </div>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            aria-label="關閉應徵表單"
            onClick={closeModal}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-modal-title"
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                  One-Click Apply
                </p>
                <h2 id="apply-modal-title" className="mt-1 text-2xl font-semibold text-slate-950">
                  投遞 {jobTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  履歷會安全上傳至平台，並提供給 {companyName} 的招募團隊審閱。
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed"
                aria-label="關閉"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <label className="block">
                <span className="text-sm font-medium text-slate-900">PDF 履歷</span>
                <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <UploadCloud className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        disabled={isSubmitting}
                        onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed"
                      />
                      <p className="mt-2 text-xs text-slate-500">僅限 PDF，檔案上限 5MB。</p>
                      {resumeFile ? (
                        <p className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{resumeFile.name}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-900">自我推薦信</span>
                <textarea
                  name="cover_letter"
                  rows={5}
                  disabled={isSubmitting}
                  placeholder="簡短說明你的相關經驗、遠端協作方式，或想補充給企業的資訊。"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </label>

              {activeScreeningQuestions.length > 0 ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-950">
                    非同步面試問題
                  </p>
                  <p className="mt-1 text-xs leading-5 text-blue-800">
                    企業會優先查看這些回答，請完整作答後再送出應徵。
                  </p>

                  <div className="mt-4 space-y-4">
                    {activeScreeningQuestions.map((question, index) => (
                      <label key={`${question}-${index}`} className="block">
                        <span className="text-sm font-medium text-slate-900">
                          {index + 1}. {question}
                        </span>
                        <textarea
                          name={`screening_answer_${index}`}
                          rows={4}
                          required
                          disabled={isSubmitting}
                          placeholder="請輸入你的回答。"
                          className="mt-2 w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                {isSubmitting ? "送出中..." : "送出應徵"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
