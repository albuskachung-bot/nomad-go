import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CircleAlert,
  Clock3,
  PlayCircle,
  ShieldCheck,
  Workflow
} from "lucide-react";
import AutomationRuleForm from "@/app/admin/edm/automations/AutomationRuleForm";
import { getCurrentAdminContext } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EdmAutomationRule, EdmAutomationTrigger } from "@/lib/types";

type RulesResult = {
  rules: EdmAutomationRule[];
  error: string | null;
};

const triggerLabels: Record<EdmAutomationTrigger, string> = {
  cart_abandoned: "購物車挽回",
  esim_expiry_reminder: "eSIM 效期提醒",
  pre_trip: "行前通知"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeTrigger(value: string | null | undefined): EdmAutomationTrigger {
  if (
    value === "cart_abandoned" ||
    value === "esim_expiry_reminder" ||
    value === "pre_trip"
  ) {
    return value;
  }

  return "cart_abandoned";
}

async function getAutomationRules(): Promise<RulesResult> {
  const context = await getCurrentAdminContext();

  if (!context.supabase || !context.user) {
    redirect("/admin/login");
  }

  if (!context.isSuperAdmin && context.profile?.role !== "super_admin") {
    redirect("/admin");
  }

  const supabase = createSupabaseAdminClient() ?? context.supabase;
  const { data, error } = await supabase
    .from("edm_automation_rules")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return {
      rules: [],
      error: error.message
    };
  }

  return {
    rules: (data ?? []) as EdmAutomationRule[],
    error: null
  };
}

export default async function AdminEdmAutomationsPage() {
  const { rules, error } = await getAutomationRules();
  const activeCount = rules.filter((rule) => rule.is_active).length;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/edm"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回 EDM 列表
          </Link>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Marketing Automation
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            EDM 自動化腳本
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            管理購物車挽回、eSIM 效期提醒與行前通知等事件觸發模板。
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Super Admin only
        </span>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">自動化規則讀取失敗。</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <Workflow className="h-5 w-5 text-cyan-700" aria-hidden="true" />
          <p className="mt-5 text-3xl font-semibold tracking-normal text-slate-950">
            {rules.length}
          </p>
          <p className="mt-2 text-sm text-slate-500">個自動化規則</p>
        </article>
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <PlayCircle className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <p className="mt-5 text-3xl font-semibold tracking-normal text-slate-950">
            {activeCount}
          </p>
          <p className="mt-2 text-sm text-slate-500">個目前啟用</p>
        </article>
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <Clock3 className="h-5 w-5 text-amber-700" aria-hidden="true" />
          <p className="mt-5 text-3xl font-semibold tracking-normal text-slate-950">
            Cron
          </p>
          <p className="mt-2 text-sm text-slate-500">由 `/api/cron/process-automations` 處理</p>
        </article>
      </section>

      <section className="grid gap-6">
        {rules.map((rule) => (
          <div key={rule.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {triggerLabels[normalizeTrigger(rule.event_trigger)]}
              </span>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
                延遲 {rule.delay_hours} 小時
              </span>
            </div>
            <AutomationRuleForm rule={rule} mode="edit" />
          </div>
        ))}
      </section>

      <AutomationRuleForm mode="create" />
    </div>
  );
}
