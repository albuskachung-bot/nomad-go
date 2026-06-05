import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, PenLine, Plus, UserRound } from "lucide-react";
import { createVirtualAuthor } from "@/app/admin/virtual-authors/actions";
import { getCurrentAdminContext } from "@/lib/admin";
import type { Profile } from "@/lib/types";

type VirtualAuthorsPageProps = {
  searchParams?: Promise<{
    created?: string;
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const errorMessages: Record<string, string> = {
  "missing-name": "請輸入虛擬作者姓名。",
  "create-failed": "虛擬作者建立失敗，請確認資料庫 migration 已套用。"
};

function getDisplayName(profile: Profile) {
  return profile.full_name?.trim() || profile.title?.trim() || "未命名虛擬作者";
}

export default async function AdminVirtualAuthorsPage({
  searchParams
}: VirtualAuthorsPageProps) {
  const { supabase, user, profile, isSuperAdmin } = await getCurrentAdminContext();

  if (!user) {
    redirect("/admin/login");
  }

  if (!isSuperAdmin && profile?.role !== "super_admin") {
    redirect("/admin");
  }

  const query = await searchParams;
  const notice = query?.created ? "虛擬作者已建立。" : null;
  const error = query?.error ? errorMessages[query.error] ?? "操作失敗。" : null;
  let virtualAuthors: Profile[] = [];

  if (supabase) {
    const { data, error: loadError } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_virtual_author", true)
      .order("created_at", { ascending: false });

    if (loadError) {
      console.error("[virtual-authors] Failed to load virtual authors.", loadError);
    }

    virtualAuthors = (data ?? []) as Profile[];
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/posts/create"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回官方專欄
          </Link>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Virtual Authors
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            虛擬作者管理
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            建立可連結至個人主頁的專欄作者 profile。
          </p>
        </div>
      </section>

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <form
          action={createVirtualAuthor}
          className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-cyan-700" aria-hidden="true" />
            <h2 className="font-semibold text-slate-900">新增虛擬作者</h2>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">姓名</span>
            <input
              name="full_name"
              required
              placeholder="NOMAD-GO 編輯部"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">頭銜</span>
            <input
              name="title"
              placeholder="資深數位遊牧者"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">大頭貼 URL</span>
            <input
              name="avatar_url"
              placeholder="https://..."
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">簡介</span>
            <textarea
              name="bio"
              rows={5}
              placeholder="分享遠端工作、城市移動與工具選擇的觀察。"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            建立作者
          </button>
        </form>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-cyan-700" aria-hidden="true" />
            <h2 className="font-semibold text-slate-900">已建立作者</h2>
          </div>

          {virtualAuthors.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {virtualAuthors.map((author) => (
                <article
                  key={author.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    {author.avatar_url ? (
                      <div
                        className="h-12 w-12 shrink-0 rounded-xl bg-white bg-cover bg-center ring-1 ring-slate-200"
                        style={{ backgroundImage: `url(${author.avatar_url})` }}
                        aria-label={`${getDisplayName(author)} 大頭貼`}
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-cyan-700 ring-1 ring-cyan-100">
                        <PenLine className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-950">
                        {getDisplayName(author)}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {author.job_title ?? author.title ?? "NOMAD-GO 作者"}
                      </p>
                    </div>
                  </div>
                  {author.bio ? (
                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                      {author.bio}
                    </p>
                  ) : null}
                  <Link
                    href={`/talents/${author.id}`}
                    className="mt-4 inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-900"
                  >
                    查看個人主頁
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              尚未建立虛擬作者。
            </p>
          )}
        </section>
      </section>
    </div>
  );
}
