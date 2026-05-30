"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { sendEmployerMessage } from "@/app/dashboard/employer/messages/actions";

type EmployerMessageComposerProps = {
  applicationId: string;
};

export default function EmployerMessageComposer({
  applicationId
}: EmployerMessageComposerProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canSubmit = content.trim().length > 0 && !isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim()) {
      setErrorMessage("請輸入訊息內容。");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const result = await sendEmployerMessage(formData);

        if (!result.ok) {
          setErrorMessage(result.message);
          return;
        }

        setContent("");
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "訊息送出失敗，請稍後再試。");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-200 p-5">
      <input type="hidden" name="application_id" value={applicationId} />
      <label className="sr-only" htmlFor="employer-message-content">
        輸入訊息
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <textarea
          id="employer-message-content"
          name="content"
          rows={3}
          required
          maxLength={4000}
          value={content}
          disabled={isPending}
          onChange={(event) => setContent(event.target.value)}
          placeholder="輸入面試邀約、補件需求或後續安排..."
          className="min-h-24 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {isPending ? "送出中..." : "送出"}
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-3 text-sm font-medium text-rose-600" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
