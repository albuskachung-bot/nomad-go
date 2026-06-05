import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CircleAlert, MailCheck, PlugZap, ShieldCheck } from "lucide-react";
import EdmSettingsForm from "@/app/admin/settings/integrations/EdmSettingsForm";
import { getCurrentAdminContext } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EdmProvider, EdmSettings } from "@/lib/types";

type SettingsResult = {
  settings: EdmSettings | null;
  error: string | null;
};

const edmSettingsId = "00000000-0000-0000-0000-000000000001";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getEdmSettings(): Promise<SettingsResult> {
  const context = await getCurrentAdminContext();

  if (!context.supabase || !context.user) {
    redirect("/admin/login");
  }

  if (!context.isSuperAdmin && context.profile?.role !== "super_admin") {
    redirect("/admin");
  }

  const supabase = createSupabaseAdminClient() ?? context.supabase;
  const { data, error } = await supabase
    .from("edm_settings")
    .select("*")
    .eq("id", edmSettingsId)
    .maybeSingle();

  if (error) {
    return {
      settings: null,
      error: error.message
    };
  }

  return {
    settings: (data as EdmSettings | null) ?? null,
    error: null
  };
}

function normalizeProvider(value: string | null | undefined): EdmProvider {
  return value === "sendgrid" || value === "ses" ? value : "none";
}

export default async function AdminIntegrationsPage() {
  const { settings, error } = await getEdmSettings();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回營運總覽
          </Link>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Integrations
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            整合設定
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            管理 EDM 發信服務憑證與預設寄件人資料，Phase 1 先保存設定並預留 API 串接位置。
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
            <p className="font-semibold">EDM 設定讀取失敗。</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <EdmSettingsForm
          initialProvider={normalizeProvider(settings?.provider)}
          initialSenderName={settings?.sender_name ?? ""}
          initialSenderEmail={settings?.sender_email ?? ""}
          hasApiKey={Boolean(settings?.api_key)}
        />

        <aside className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <PlugZap className="h-5 w-5 text-cyan-700" aria-hidden="true" />
            <h2 className="mt-4 font-semibold text-slate-900">發信 API 狀態</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              目前 provider 設為 {normalizeProvider(settings?.provider).toUpperCase()}。
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <MailCheck className="h-5 w-5 text-cyan-700" aria-hidden="true" />
            <h2 className="mt-4 font-semibold text-slate-900">Phase 1 範圍</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              後台先保存憑證、寄件人與 Campaign 設定；真實 SendGrid/SES 呼叫會在 dispatch action 的 TODO 位置接上。
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
