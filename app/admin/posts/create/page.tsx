import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import PostEditorForm, {
  type PostAuthorOption
} from "@/app/dashboard/nomad/posts/PostEditorForm";
import { getCurrentAdminContext } from "@/lib/admin";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CreateAdminPostPage() {
  const { supabase, user, profile, isSuperAdmin } = await getCurrentAdminContext();

  if (!user) {
    redirect("/admin/login");
  }

  if (!isSuperAdmin && profile?.role !== "super_admin") {
    redirect("/admin");
  }

  const authorOptions: PostAuthorOption[] = [];

  if (profile) {
    authorOptions.push({
      id: profile.id,
      name: profile.full_name?.trim() || user.email || "NOMAD-GO Admin",
      title: profile.job_title ?? profile.title ?? "NOMAD-GO 管理員",
      avatarUrl: profile.avatar_url ?? null,
      isVirtual: false
    });
  }

  if (supabase) {
    const { data: virtualAuthors, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_virtual_author", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin-posts/create] Failed to load virtual authors.", error);
    }

    ((virtualAuthors ?? []) as Profile[]).forEach((author) => {
      authorOptions.push({
        id: author.id,
        name: author.full_name?.trim() || author.title?.trim() || "未命名虛擬作者",
        title: author.job_title ?? author.title ?? "NOMAD-GO 作者",
        avatarUrl: author.avatar_url ?? null,
        isVirtual: true
      });
    });
  }

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
            Official Column
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            新增官方專欄
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            建立前台遊牧專欄文章，並從管理員或虛擬作者 profile 中選擇發佈身分。
          </p>
        </div>

        <Link
          href="/admin/virtual-authors"
          className="inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-cyan-100 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
        >
          <Users className="h-4 w-4" aria-hidden="true" />
          管理虛擬作者
        </Link>
      </section>

      <PostEditorForm variant="admin" authorOptions={authorOptions} />
    </div>
  );
}
