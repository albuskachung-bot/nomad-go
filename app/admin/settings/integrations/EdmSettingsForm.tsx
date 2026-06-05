"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { CheckCircle2, KeyRound, Loader2, Save, XCircle } from "lucide-react";
import { saveEdmSettings } from "@/app/actions/edm";
import type { EdmProvider } from "@/lib/types";

type EdmSettingsFormProps = {
  initialProvider: EdmProvider;
  initialSenderName: string;
  initialSenderEmail: string;
  hasApiKey: boolean;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const providerOptions: Array<{
  value: EdmProvider;
  label: string;
}> = [
  {
    value: "none",
    label: "暫不啟用"
  },
  {
    value: "sendgrid",
    label: "SendGrid"
  },
  {
    value: "ses",
    label: "AWS SES"
  }
];

export default function EdmSettingsForm({
  initialProvider,
  initialSenderName,
  initialSenderEmail,
  hasApiKey
}: EdmSettingsFormProps) {
  const [provider, setProvider] = useState<EdmProvider>(initialProvider);
  const [senderName, setSenderName] = useState(initialSenderName);
  const [senderEmail, setSenderEmail] = useState(initialSenderEmail);
  const [apiKey, setApiKey] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(() => {
      saveEdmSettings(formData)
        .then((result) => {
          setToast({
            type: result.ok ? "success" : "error",
            message: result.message
          });

          if (result.ok) {
            setApiKey("");
          }
        })
        .catch((error) => {
          setToast({
            type: "error",
            message: error instanceof Error ? error.message : "EDM 設定儲存失敗。"
          });
        });
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      {toast ? (
        <div
          className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${
            toast.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
          role="status"
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{toast.message}</span>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">發信服務商</span>
          <select
            name="provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as EdmProvider)}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          >
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">API Key</span>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-100">
            <KeyRound className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <input
              name="api_key"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={hasApiKey ? "已設定，留空則保留原 key" : "貼上服務商 API Key"}
              className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
              disabled={provider === "none"}
            />
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">
            預設寄件人名稱
          </span>
          <input
            name="sender_name"
            value={senderName}
            onChange={(event) => setSenderName(event.target.value)}
            placeholder="NOMAD-GO"
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">
            預設寄件人 Email
          </span>
          <input
            name="sender_email"
            type="email"
            value={senderEmail}
            onChange={(event) => setSenderEmail(event.target.value)}
            placeholder="newsletter@nomad-go.com"
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          儲存整合設定
        </button>
      </div>
    </form>
  );
}
