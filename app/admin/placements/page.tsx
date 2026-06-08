import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CircleAlert, LayoutPanelTop } from "lucide-react";
import PlacementsManager from "@/app/admin/placements/components/PlacementsManager";
import { getCurrentAdminContext } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PlatformPlacement } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlacementsResult = {
  placements: PlatformPlacement[];
  error: string | null;
};

function readText(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

async function requirePlacementAdmin() {
  const context = await getCurrentAdminContext();

  if (!context.supabase || !context.user) {
    redirect("/admin/login");
  }

  if (!["super_admin", "editor"].includes(context.profile?.role ?? "")) {
    redirect("/admin");
  }

  return {
    supabase: createSupabaseAdminClient() ?? context.supabase
  };
}

async function getPlacements(): Promise<PlacementsResult> {
  const { supabase } = await requirePlacementAdmin();
  const { data, error } = await supabase
    .from("platform_placements")
    .select("*")
    .order("location", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    return {
      placements: [],
      error: error.message
    };
  }

  return {
    placements: data ?? [],
    error: null
  };
}

async function togglePlacementActive(formData: FormData) {
  "use server";

  const { supabase } = await requirePlacementAdmin();
  const id = readText(formData.get("id"));
  const nextActive = formData.get("next_active") === "true";

  if (!id) {
    redirect("/admin/placements?error=missing-placement-id");
  }

  const { error } = await supabase
    .from("platform_placements")
    .update({ is_active: nextActive })
    .eq("id", id);

  if (error) {
    redirect(`/admin/placements?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/placements");
  redirect("/admin/placements?updated=1");
}

async function deletePlacement(formData: FormData) {
  "use server";

  const { supabase } = await requirePlacementAdmin();
  const id = readText(formData.get("id"));

  if (!id) {
    redirect("/admin/placements?error=missing-placement-id");
  }

  const { error } = await supabase.from("platform_placements").delete().eq("id", id);

  if (error) {
    redirect(`/admin/placements?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/placements");
  redirect("/admin/placements?deleted=1");
}

export default async function AdminPlacementsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { placements, error } = await getPlacements();
  const queryError =
    typeof params?.error === "string" ? decodeURIComponent(params.error) : null;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Platform Placements
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            全站動態版位
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            管理首頁公告列、Hero Banner 與資訊流廣告的基礎內容與啟用狀態。
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
          <LayoutPanelTop className="h-3.5 w-3.5" aria-hidden="true" />
          Live content
        </span>
      </section>

      {error || queryError ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{queryError ?? `版位資料讀取失敗：${error}`}</p>
        </div>
      ) : null}

      <PlacementsManager
        placements={placements}
        togglePlacementActiveAction={togglePlacementActive}
        deletePlacementAction={deletePlacement}
      />
    </div>
  );
}
