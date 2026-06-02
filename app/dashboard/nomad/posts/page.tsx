import Link from "next/link";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Edit3,
  Eye,
  FileText,
  Plus,
  Trash2
} from "lucide-react";
import { deleteNomadPost } from "@/app/dashboard/nomad/posts/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";

type PostsResult = {
  posts: Post[];
  error: string | null;
};

async function deletePostAction(formData: FormData) {
  "use server";

  await deleteNomadPost(formData);
}

function formatDate(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "日期待確認";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(parsedDate);
}

async function getMyPosts(): Promise<PostsResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      posts: [],
      error: "尚未設定 Supabase 環境變數，無法讀取文章。"
    };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      posts: [],
      error: "請先登入會員中心。"
    };
  }

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("author_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      posts: [],
      error: error.message
    };
  }

  return {
    posts: (data ?? []) as Post[],
    error: null
  };
}

export default async function NomadPostsPage() {
  const { posts, error } = await getMyPosts();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Nomad Column
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            我的專欄
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            分享遠距生活、城市觀察、咖啡廳推薦與工具心得，建立你的個人品牌與 SEO 累積。
          </p>
        </div>
        <Link
          href="/dashboard/nomad/posts/create"
          className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          新增文章
        </Link>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100">
        <div className="flex items-center gap-3 border-b border-emerald-100 px-5 py-4 sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">文章列表</h2>
            <p className="text-xs text-slate-500">草稿與已發布文章都會顯示在這裡。</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">文章</th>
                <th className="px-6 py-4">標籤</th>
                <th className="px-6 py-4">狀態</th>
                <th className="px-6 py-4">更新時間</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.map((post) => (
                <tr key={post.id} className="transition hover:bg-slate-50/70">
                  <td className="px-6 py-5">
                    <div className="font-semibold text-slate-900">{post.title}</div>
                    <div className="mt-1 text-xs text-slate-500">/{post.slug}</div>
                  </td>
                  <td className="px-6 py-5">
                    {post.tags.length > 0 ? (
                      <div className="flex max-w-sm flex-wrap gap-2">
                        {post.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">尚未設定</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                        post.is_published
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          : "bg-amber-50 text-amber-700 ring-amber-100"
                      }`}
                    >
                      {post.is_published ? (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {post.is_published ? "已發布" : "草稿"}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-slate-600">{formatDate(post.updated_at)}</td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2">
                      {post.is_published ? (
                        <Link
                          href={`/blog/${post.slug}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-100 hover:text-emerald-700"
                          aria-label="查看文章"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      ) : null}
                      <Link
                        href={`/dashboard/nomad/posts/${post.id}/edit`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-100 hover:text-emerald-700"
                        aria-label="編輯文章"
                      >
                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <form action={deletePostAction}>
                        <input type="hidden" name="post_id" value={post.id} />
                        <input type="hidden" name="slug" value={post.slug} />
                        <button
                          type="submit"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 text-rose-500 transition hover:bg-rose-50"
                          aria-label="刪除文章"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {posts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">尚未建立文章</p>
            <p className="mt-2 text-sm text-slate-500">
              從一篇城市心得、咖啡廳推薦或遠端工作工具清單開始。
            </p>
            <Link
              href="/dashboard/nomad/posts/create"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              新增第一篇文章
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
