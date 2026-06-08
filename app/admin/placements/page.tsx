import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CircleAlert, LayoutPanelTop } from "lucide-react";
import PlacementForm from "@/app/admin/placements/components/PlacementForm";
import { getCurrentAdminContext } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PlatformPlacement, PlatformPlacementLocation } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const placementLocations: PlatformPlacementLocation[] = [
  "announcement_bar",
  "hero_banner",
  "in_feed_ad"
];

const locationLabels: Record<PlatformPlacementLocation, string> = {
  announcement_bar: "頂部公告列",
  hero_banner: "首頁 Hero Banner",
  in_feed_ad: "資訊流廣告"
};

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
  const groupedPlacements = placementLocations.map((location) => ({
    location,
    items: placements.filter((placement) => placement.location === location)
  }));
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

      <PlacementForm />

      {groupedPlacements.map(({ location, items }) => (
        <section
          key={location}
          className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
        >
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-slate-900">{locationLabels[location]}</h2>
            <p className="mt-1 text-xs text-slate-500">{location}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">內容</th>
                  <th className="px-6 py-4">連結</th>
                  <th className="px-6 py-4">排序</th>
                  <th className="px-6 py-4">狀態</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((placement) => (
                  <tr key={placement.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-slate-900">{placement.title}</p>
                      {placement.subtitle ? (
                        <p className="mt-1 text-xs text-slate-500">{placement.subtitle}</p>
                      ) : null}
                      {placement.image_url ? (
                        <p className="mt-1 max-w-sm truncate text-xs text-slate-400">
                          {placement.image_url}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-6 py-5">
                      {placement.link_url ? (
                        <div>
                          <p className="max-w-xs truncate font-medium text-slate-700">
                            {placement.link_url}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {placement.link_text ?? "未設定按鈕文字"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">未設定</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-slate-600">{placement.sort_order}</td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                          placement.is_active
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-slate-100 text-slate-600 ring-slate-200"
                        }`}
                      >
                        {placement.is_active ? "啟用" : "停用"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <form action={togglePlacementActive}>
                          <input type="hidden" name="id" value={placement.id} />
                          <input
                            type="hidden"
                            name="next_active"
                            value={String(!placement.is_active)}
                          />
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
                          >
                            {placement.is_active ? "停用" : "啟用"}
                          </button>
                        </form>
                        <form action={deletePlacement}>
                          <input type="hidden" name="id" value={placement.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                          >
                            刪除
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              目前沒有此位置的版位。
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
