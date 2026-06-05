"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition
} from "react";
import { useRouter } from "next/navigation";
import {
  Bold,
  CheckCircle2,
  Heading2,
  Italic,
  Link2,
  List,
  Loader2,
  Save,
  Send,
  XCircle
} from "lucide-react";
import { saveEdmCampaign } from "@/app/actions/edm";
import type { EdmAudienceSegment, EdmCampaign } from "@/lib/types";

type EdmCampaignFormProps = {
  campaign?: EdmCampaign | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const defaultHtml = `<p>Hi {{user_name}},</p><p>歡迎閱讀 NOMAD-GO 的最新消息。</p>`;

const audienceOptions: Array<{
  value: EdmAudienceSegment;
  label: string;
  description: string;
}> = [
  {
    value: "all",
    label: "所有會員",
    description: "發送給所有非停權會員。"
  },
  {
    value: "paid",
    label: "Pro/VIP 付費會員",
    description: "僅包含 subscription_plan 為 Pro 或 VIP 的人才會員。"
  },
  {
    value: "free",
    label: "Free 免費會員",
    description: "包含 Free 或尚未設定方案的會員。"
  }
];

function formatDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function getInitialAudience(campaign: EdmCampaign | null | undefined): EdmAudienceSegment {
  const audience = campaign?.target_segment?.audience;
  return audience === "paid" || audience === "free" ? audience : "all";
}

export default function EdmCampaignForm({ campaign }: EdmCampaignFormProps) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [name, setName] = useState(campaign?.name ?? "");
  const [subject, setSubject] = useState(campaign?.subject ?? "");
  const [audience, setAudience] = useState<EdmAudienceSegment>(
    getInitialAudience(campaign)
  );
  const [scheduledAt, setScheduledAt] = useState(
    formatDateTimeLocal(campaign?.scheduled_at)
  );
  const [content, setContent] = useState(campaign?.content ?? defaultHtml);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingIntent, setPendingIntent] = useState<"draft" | "schedule" | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!editorRef.current || initializedRef.current) {
      return;
    }

    editorRef.current.innerHTML = campaign?.content ?? defaultHtml;
    initializedRef.current = true;
  }, [campaign?.content]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function syncEditorContent() {
    setContent(editorRef.current?.innerHTML ?? "");
  }

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorContent();
  }

  function insertLink() {
    const url = window.prompt("請輸入連結 URL");

    if (!url) {
      return;
    }

    runCommand("createLink", url);
  }

  function submitCampaign(intent: "draft" | "schedule") {
    const formData = new FormData();
    formData.set("campaign_id", campaign?.id ?? "");
    formData.set("name", name);
    formData.set("subject", subject);
    formData.set("audience", audience);
    formData.set("scheduled_at", scheduledAt);
    formData.set("content", editorRef.current?.innerHTML ?? content);
    formData.set("intent", intent);
    setPendingIntent(intent);

    startTransition(() => {
      saveEdmCampaign(formData)
        .then((result) => {
          setToast({
            type: result.ok ? "success" : "error",
            message: result.message
          });

          if (result.ok && result.campaignId && !campaign?.id) {
            router.replace(`/admin/edm/create?id=${result.campaignId}`);
          }

          if (result.ok) {
            router.refresh();
          }
        })
        .catch((error) => {
          setToast({
            type: "error",
            message: error instanceof Error ? error.message : "EDM 任務儲存失敗。"
          });
        })
        .finally(() => setPendingIntent(null));
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitCampaign("draft");
  }

  const isSavingDraft = isPending && pendingIntent === "draft";
  const isScheduling = isPending && pendingIntent === "schedule";

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
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
            <span className="text-sm font-semibold text-slate-700">
              內部活動名稱
            </span>
            <input
              name="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：2026 六月遊牧會員月報"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">信件主旨</span>
            <input
              name="subject"
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="本週遠端職缺與遊牧工具精選"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">目標客群</span>
            <select
              name="audience"
              value={audience}
              onChange={(event) => setAudience(event.target.value as EdmAudienceSegment)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              {audienceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              預計發送時間
            </span>
            <input
              name="scheduled_at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        </div>

        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-semibold text-slate-700">HTML 內容</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                title="粗體"
                onClick={() => runCommand("bold")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              >
                <Bold className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                title="斜體"
                onClick={() => runCommand("italic")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              >
                <Italic className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                title="標題"
                onClick={() => runCommand("formatBlock", "h2")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              >
                <Heading2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                title="項目清單"
                onClick={() => runCommand("insertUnorderedList")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                title="插入連結"
                onClick={insertLink}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              >
                <Link2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncEditorContent}
            className="prose prose-cyan mt-3 min-h-[360px] max-w-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingDraft ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            儲存草稿
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => submitCampaign("schedule")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isScheduling ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            儲存並排程
          </button>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-semibold text-slate-900">變數提示</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            可在內容中使用 <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
              {"{{user_name}}"}
            </code>{" "}
            作為收件人姓名變數。
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-semibold text-slate-900">目前客群</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {audienceOptions.find((option) => option.value === audience)?.description}
          </p>
        </div>
      </aside>
    </form>
  );
}
