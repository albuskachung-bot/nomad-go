import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CircleAlert, MapPin, Plus } from "lucide-react";
import { getCurrentAdminContext } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CityGuide } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CityGuidesResult = {
  guides: CityGuide[];
  error: string | null;
};

function readText(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function readSortOrder(value: FormDataEntryValue | null) {
  const sortOrder = Number.parseInt(readText(value), 10);
  return Number.isFinite(sortOrder) ? sortOrder : 0;
}

async function requireHomeContentAdmin() {
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

async function getCityGuides(): Promise<CityGuidesResult> {
  const { supabase } = await requireHomeContentAdmin();
  const { data, error } = await supabase
    .from("city_guides")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return {
      guides: [],
      error: error.message
    };
  }

  return {
    guides: data ?? [],
    error: null
  };
}

async function createCityGuide(formData: FormData) {
  "use server";

  const { supabase } = await requireHomeContentAdmin();
  const cityName = readText(formData.get("city_name"));
  const country = readText(formData.get("country"));
  const budgetEst = readText(formData.get("budget_est"));
  const internetSpeed = readText(formData.get("internet_speed"));
  const timezone = readText(formData.get("timezone"));
  const imageUrl = readText(formData.get("image_url"));

  if (!cityName || !country || !budgetEst || !internetSpeed || !timezone || !imageUrl) {
    redirect("/admin/city-guides?error=missing-required-fields");
  }

  const { error } = await supabase.from("city_guides").insert({
    city_name: cityName,
    country,
    budget_est: budgetEst,
    internet_speed: internetSpeed,
    timezone,
    image_url: imageUrl,
    is_active: formData.get("is_active") === "on",
    sort_order: readSortOrder(formData.get("sort_order"))
  });

  if (error) {
    redirect(`/admin/city-guides?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/city-guides");
  redirect("/admin/city-guides?created=1");
}

async function updateCityGuide(formData: FormData) {
  "use server";

  const { supabase } = await requireHomeContentAdmin();
  const id = readText(formData.get("id"));

  if (!id) {
    redirect("/admin/city-guides?error=missing-guide-id");
  }

  const { error } = await supabase
    .from("city_guides")
    .update({
      city_name: readText(formData.get("city_name")),
      country: readText(formData.get("country")),
      budget_est: readText(formData.get("budget_est")),
      internet_speed: readText(formData.get("internet_speed")),
      timezone: readText(formData.get("timezone")),
      image_url: readText(formData.get("image_url")),
      sort_order: readSortOrder(formData.get("sort_order"))
    })
    .eq("id", id);

  if (error) {
    redirect(`/admin/city-guides?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/city-guides");
  redirect("/admin/city-guides?updated=1");
}

async function toggleCityGuideActive(formData: FormData) {
  "use server";

  const { supabase } = await requireHomeContentAdmin();
  const id = readText(formData.get("id"));
  const nextActive = formData.get("next_active") === "true";

  if (!id) {
    redirect("/admin/city-guides?error=missing-guide-id");
  }

  const { error } = await supabase
    .from("city_guides")
    .update({ is_active: nextActive })
    .eq("id", id);

  if (error) {
    redirect(`/admin/city-guides?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/city-guides");
  redirect("/admin/city-guides?updated=1");
}

async function deleteCityGuide(formData: FormData) {
  "use server";

  const { supabase } = await requireHomeContentAdmin();
  const id = readText(formData.get("id"));

  if (!id) {
    redirect("/admin/city-guides?error=missing-guide-id");
  }

  const { error } = await supabase.from("city_guides").delete().eq("id", id);

  if (error) {
    redirect(`/admin/city-guides?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/city-guides");
  redirect("/admin/city-guides?deleted=1");
}

function TextInput({
  name,
  defaultValue,
  placeholder,
  required = false,
  form
}: {
  name: string;
  defaultValue?: string | number;
  placeholder?: string;
  required?: boolean;
  form?: string;
}) {
  return (
    <input
      form={form}
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
    />
  );
}

export default async function AdminCityGuidesPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { guides, error } = await getCityGuides();
  const queryError =
    typeof params?.error === "string" ? decodeURIComponent(params.error) : null;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            City Guides
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            城市指南管理
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            管理首頁城市指南卡片的封面、預算、網速、時區與上下架狀態。
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          Homepage
        </span>
      </section>

      {error || queryError ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{queryError ?? `城市指南讀取失敗：${error}`}</p>
        </div>
      ) : null}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <Plus className="h-4 w-4 text-cyan-700" aria-hidden="true" />
          <h2 className="font-semibold text-slate-900">新增城市指南</h2>
        </div>
        <form action={createCityGuide} className="grid gap-4 lg:grid-cols-8">
          <TextInput name="city_name" placeholder="Taipei" required />
          <TextInput name="country" placeholder="Taiwan" required />
          <TextInput name="budget_est" placeholder="$1,200/mo" required />
          <TextInput name="internet_speed" placeholder="50 Mbps" required />
          <TextInput name="timezone" placeholder="GMT+8" required />
          <div className="lg:col-span-2">
            <TextInput name="image_url" placeholder="https://..." required />
          </div>
          <TextInput name="sort_order" defaultValue={0} />
          <div className="flex items-end gap-4 lg:col-span-8">
            <label className="flex items-center gap-2 pb-2 text-sm font-medium text-slate-700">
              <input
                name="is_active"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              上架
            </label>
            <button
              type="submit"
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800"
            >
              新增
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="font-semibold text-slate-900">所有城市指南</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">城市</th>
                <th className="px-6 py-4">預算</th>
                <th className="px-6 py-4">網速</th>
                <th className="px-6 py-4">時區</th>
                <th className="px-6 py-4">圖片 URL</th>
                <th className="px-6 py-4">排序</th>
                <th className="px-6 py-4">狀態</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {guides.map((guide) => (
                <tr key={guide.id} className="align-top transition hover:bg-slate-50/70">
                  <td className="px-6 py-5">
                    <form id={`guide-${guide.id}`} action={updateCityGuide} className="grid gap-2">
                      <input type="hidden" name="id" value={guide.id} />
                      <TextInput name="city_name" defaultValue={guide.city_name} required />
                      <TextInput name="country" defaultValue={guide.country} required />
                    </form>
                  </td>
                  <td className="px-6 py-5">
                    <TextInput
                      form={`guide-${guide.id}`}
                      name="budget_est"
                      defaultValue={guide.budget_est}
                      required
                    />
                  </td>
                  <td className="px-6 py-5">
                    <TextInput
                      form={`guide-${guide.id}`}
                      name="internet_speed"
                      defaultValue={guide.internet_speed}
                      required
                    />
                  </td>
                  <td className="px-6 py-5">
                    <TextInput
                      form={`guide-${guide.id}`}
                      name="timezone"
                      defaultValue={guide.timezone}
                      required
                    />
                  </td>
                  <td className="px-6 py-5">
                    <TextInput
                      form={`guide-${guide.id}`}
                      name="image_url"
                      defaultValue={guide.image_url}
                      required
                    />
                  </td>
                  <td className="px-6 py-5">
                    <TextInput
                      form={`guide-${guide.id}`}
                      name="sort_order"
                      defaultValue={guide.sort_order}
                    />
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                        guide.is_active
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-slate-100 text-slate-600 ring-slate-200"
                      }`}
                    >
                      {guide.is_active ? "上架" : "下架"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2">
                      <button
                        form={`guide-${guide.id}`}
                        type="submit"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
                      >
                        儲存
                      </button>
                      <form action={toggleCityGuideActive}>
                        <input type="hidden" name="id" value={guide.id} />
                        <input
                          type="hidden"
                          name="next_active"
                          value={String(!guide.is_active)}
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
                        >
                          {guide.is_active ? "下架" : "上架"}
                        </button>
                      </form>
                      <form action={deleteCityGuide}>
                        <input type="hidden" name="id" value={guide.id} />
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
        {guides.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            目前沒有城市指南。
          </div>
        ) : null}
      </section>
    </div>
  );
}
