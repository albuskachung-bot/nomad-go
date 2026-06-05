"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  Save,
  ToggleLeft,
  ToggleRight,
  XCircle
} from "lucide-react";
import { saveEdmAutomationRule } from "@/app/actions/edm";
import type { EdmAutomationRule, EdmAutomationTrigger } from "@/lib/types";

type AutomationRuleFormProps = {
  rule?: EdmAutomationRule | null;
  mode: "create" | "edit";
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const triggerOptions: Array<{
  value: EdmAutomationTrigger;
  label: string;
  defaultDelayHours: number;
  description: string;
}> = [
  {
    value: "cart_abandoned",
    label: "購物車挽回",
    defaultDelayHours: 24,
    description: "加入購物車或建立未付款訂單後延遲 24 小時觸發。"
  },
  {
    value: "esim_expiry_reminder",
    label: "eSIM 效期提醒",
    defaultDelayHours: 672,
    description: "購買 eSIM 後第 28 天觸發，提醒 30 天內安裝啟用。"
  },
  {
    value: "pre_trip",
    label: "行前通知",
    defaultDelayHours: 72,
    description: "出發前 3 天觸發，寄送天氣與注意事項模板。"
  }
];

const defaultTemplates: Record<
  EdmAutomationTrigger,
  {
    subject: string;
    content: string;
  }
> = {
  cart_abandoned: {
    subject: "{{user_name}}，你的 NOMAD-GO 訂單還在等待完成",
    content:
      "<p>Hi {{user_name}},</p><p>你先前建立的訂單尚未完成付款。若仍需要遠端工作或出發工具支援，可以回到 NOMAD-GO 繼續完成。</p>"
  },
  esim_expiry_reminder: {
    subject: "{{user_name}}，你的 eSIM 即將超過安裝期限",
    content:
      "<p>Hi {{user_name}},</p><p>提醒你：eSIM 須於購買後 30 天內完成安裝與啟用，逾期將無法使用。</p><p>若你尚未安裝，請盡快依照購買通知中的步驟完成設定。</p>"
  },
  pre_trip: {
    subject: "{{user_name}}，出發前 3 天準備清單",
    content:
      "<p>Hi {{user_name}},</p><p>距離你的出發時間約剩 3 天。請再次確認目的地天氣、網路工具、簽證與保險資訊。</p><ul><li>查看目的地天氣與體感溫度</li><li>確認 eSIM 或漫遊方案可用</li><li>備份護照、住宿與交通資料</li></ul>"
  }
};

function getInitialTrigger(rule?: EdmAutomationRule | null): EdmAutomationTrigger {
  return rule?.event_trigger ?? "cart_abandoned";
}

function getTriggerMeta(trigger: EdmAutomationTrigger) {
  return triggerOptions.find((option) => option.value === trigger) ?? triggerOptions[0];
}

export default function AutomationRuleForm({ rule, mode }: AutomationRuleFormProps) {
  const initialTrigger = getInitialTrigger(rule);
  const [name, setName] = useState(rule?.name ?? getTriggerMeta(initialTrigger).label);
  const [eventTrigger, setEventTrigger] = useState<EdmAutomationTrigger>(initialTrigger);
  const [delayHours, setDelayHours] = useState(
    String(rule?.delay_hours ?? getTriggerMeta(initialTrigger).defaultDelayHours)
  );
  const [emailSubject, setEmailSubject] = useState(
    rule?.email_subject ?? defaultTemplates[initialTrigger].subject
  );
  const [emailContent, setEmailContent] = useState(
    rule?.email_content ?? defaultTemplates[initialTrigger].content
  );
  const [isActive, setIsActive] = useState(rule?.is_active ?? true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function applyTriggerDefaults(nextTrigger: EdmAutomationTrigger) {
    setEventTrigger(nextTrigger);

    if (mode === "create") {
      const meta = getTriggerMeta(nextTrigger);
      setName(meta.label);
      setDelayHours(String(meta.defaultDelayHours));
      setEmailSubject(defaultTemplates[nextTrigger].subject);
      setEmailContent(defaultTemplates[nextTrigger].content);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("is_active", String(isActive));

    startTransition(() => {
      saveEdmAutomationRule(formData)
        .then((result) => {
          setToast({
            type: result.ok ? "success" : "error",
            message: result.message
          });
        })
        .catch((error) => {
          setToast({
            type: "error",
            message:
              error instanceof Error ? error.message : "自動化規則儲存失敗。"
          });
        });
    });
  }

  const triggerMeta = getTriggerMeta(eventTrigger);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <input type="hidden" name="rule_id" value={rule?.id ?? ""} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">
            {mode === "create" ? "新增自動化規則" : name}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {triggerMeta.description}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsActive((current) => !current)}
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
            isActive
              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
              : "bg-slate-100 text-slate-600 ring-slate-200"
          }`}
        >
          {isActive ? (
            <ToggleRight className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ToggleLeft className="h-4 w-4" aria-hidden="true" />
          )}
          {isActive ? "啟用中" : "已停用"}
        </button>
      </div>

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

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">規則名稱</span>
          <input
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">觸發條件</span>
          <select
            name="event_trigger"
            value={eventTrigger}
            onChange={(event) =>
              applyTriggerDefaults(event.target.value as EdmAutomationTrigger)
            }
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          >
            {triggerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">延遲時間（小時）</span>
          <input
            name="delay_hours"
            type="number"
            min={0}
            required
            value={delayHours}
            onChange={(event) => setDelayHours(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">信件主旨</span>
          <input
            name="email_subject"
            required
            value={emailSubject}
            onChange={(event) => setEmailSubject(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">HTML 模板</span>
        <textarea
          name="email_content"
          required
          rows={8}
          value={emailContent}
          onChange={(event) => setEmailContent(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm leading-6 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        />
      </label>

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          可使用 <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{"{{user_name}}"}</code>{" "}
          與事件變數如 <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{"{{order_id}}"}</code>。
        </p>

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
          儲存規則
        </button>
      </div>
    </form>
  );
}
