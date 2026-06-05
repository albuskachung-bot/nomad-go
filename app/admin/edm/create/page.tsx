import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MailPlus, ShieldCheck } from "lucide-react";
import EdmCampaignForm from "@/app/admin/edm/EdmCampaignForm";
import { getCurrentAdminContext } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EdmCampaign } from "@/lib/types";

type CreateEdmCampaignPageProps = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getEditableCampaign(campaignId: string | null) {
  const context = await getCurrentAdminContext();

  if (!context.supabase || !context.user) {
    redirect("/admin/login");
  }

  if (!context.isSuperAdmin && context.profile?.role !== "super_admin") {
    redirect("/admin");
  }

  if (!campaignId) {
    return null;
  }

  const supabase = createSupabaseAdminClient() ?? context.supabase;
  const { data, error } = await supabase
    .from("edm_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (error) {
    console.error("[edm/create] Failed to load EDM campaign.", error);
    notFound();
  }

  return (data as EdmCampaign | null) ?? null;
}

export default async function CreateEdmCampaignPage({
  searchParams
}: CreateEdmCampaignPageProps) {
  const query = await searchParams;
  const campaign = await getEditableCampaign(query?.id ?? null);

  if (query?.id && !campaign) {
    notFound();
  }

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
            Campaign Editor
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            {campaign ? "編輯 EDM 任務" : "新增 EDM 任務"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            選擇目標客群、編輯 HTML 內容並保存為草稿或排程任務。
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
          {campaign ? (
            <MailPlus className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {campaign ? "Editing Campaign" : "Super Admin only"}
        </span>
      </section>

      <EdmCampaignForm campaign={campaign} />
    </div>
  );
}
