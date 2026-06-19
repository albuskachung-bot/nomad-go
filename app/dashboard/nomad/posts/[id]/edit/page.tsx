import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PostEditorForm from "@/app/dashboard/nomad/posts/PostEditorForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";

type EditNomadPostPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function getPost(postId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .eq("author_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[nomad-posts/edit] Failed to load post.", error);
    return null;
  }

  return (data as Post | null) ?? null;
}

export default async function EditNomadPostPage({ params }: EditNomadPostPageProps) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section>
        <Link
          href="/dashboard/nomad/posts"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回我的專欄
        </Link>
        <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Edit Post
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
          編輯文章
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          更新文章內容、封面圖與標籤。發布中的文章儲存後會立即更新前台內容與 SEO metadata。
        </p>
      </section>

      <PostEditorForm post={post} />
    </div>
  );
}
