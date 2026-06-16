import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CircleAlert, Star, UserRound } from "lucide-react";
import { getCurrentAdminContext } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TalentUser = {
  id: string;
  full_name: string | null;
  title: string | null;
  job_title: string | null;
  timezone: string | null;
  skills: string[] | null;
  avatar_url: string | null;
  is_featured_talent: boolean | null;
  featured_sort_order: number | null;
  created_at: string;
};

type TalentUsersResult = {
  users: TalentUser[];
  error: string | null;
};

function readText(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function getDisplayName(user: TalentUser) {
  return user.full_name?.trim() || "未命名使用者";
}

function getJobTitle(user: TalentUser) {
  return user.job_title?.trim() || user.title?.trim() || "尚未填寫職稱";
}

function getSkills(skills: string[] | null) {
  return Array.isArray(skills) ? skills.filter(Boolean).slice(0, 4) : [];
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

async function getTalentUsers(): Promise<TalentUsersResult> {
  const { supabase } = await requireHomeContentAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, title, job_title, timezone, skills, avatar_url, is_featured_talent, featured_sort_order, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return {
      users: [],
      error: error.message
    };
  }

  return {
    users: (data ?? []) as TalentUser[],
    error: null
  };
}

async function toggleFeaturedTalent(formData: FormData) {
  "use server";

  const { supabase } = await requireHomeContentAdmin();
  const id = readText(formData.get("id"));
  const nextFeatured = formData.get("next_featured") === "true";

  if (!id) {
    redirect("/admin/talents?error=missing-user-id");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_featured_talent: nextFeatured })
    .eq("id", id);

  if (error) {
    redirect(`/admin/talents?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/talent");
  revalidatePath("/admin/talents");
  redirect("/admin/talents?updated=1");
}

export default async function AdminTalentsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { users, error } = await getTalentUsers();
  const queryError =
    typeof params?.error === "string" ? decodeURIComponent(params.error) : null;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Talent Profiles
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            人才庫管理
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            直接管理系統真實註冊用戶資料，並切換首頁精選人才狀態。
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
          <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
          Profiles
        </span>
      </section>

      {error || queryError ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{queryError ?? `人才資料讀取失敗：${error}`}</p>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-semibold text-slate-900">所有人才</h2>
            <p className="mt-1 text-sm text-slate-500">
              共 {users.length} 位註冊用戶，資料來源為 profiles。
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            首頁精選
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">姓名</th>
                <th className="px-6 py-4">職稱</th>
                <th className="px-6 py-4">時區</th>
                <th className="px-6 py-4">技能</th>
                <th className="px-6 py-4 text-right">首頁精選</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const skills = getSkills(user.skills);
                const isFeatured = Boolean(user.is_featured_talent);

                return (
                  <tr key={user.id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <span
                            className="h-10 w-10 shrink-0 rounded-full bg-cover bg-center ring-1 ring-slate-200"
                            style={{ backgroundImage: `url(${user.avatar_url})` }}
                            aria-hidden="true"
                          />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                            {getDisplayName(user).slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">
                            {getDisplayName(user)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {user.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-700">
                      {getJobTitle(user)}
                    </td>
                    <td className="px-6 py-5 text-slate-600">
                      {user.timezone || "尚未填寫"}
                    </td>
                    <td className="px-6 py-5">
                      {skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">尚未填寫</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <form action={toggleFeaturedTalent} className="flex justify-end">
                        <input type="hidden" name="id" value={user.id} />
                        <input
                          type="hidden"
                          name="next_featured"
                          value={String(!isFeatured)}
                        />
                        <button
                          type="submit"
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                            isFeatured
                              ? "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100"
                              : "bg-slate-100 text-slate-600 ring-slate-200 hover:bg-cyan-50 hover:text-cyan-700 hover:ring-cyan-200"
                          }`}
                        >
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              isFeatured ? "bg-amber-500" : "bg-slate-300"
                            }`}
                            aria-hidden="true"
                          />
                          {isFeatured ? "已設為精選" : "設為首頁精選"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            目前沒有註冊用戶。
          </div>
        ) : null}
      </section>
    </div>
  );
}
