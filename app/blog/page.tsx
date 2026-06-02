import Link from "next/link";
import { ArrowUpRight, CalendarDays, PenLine } from "lucide-react";
import { getPostDescription } from "@/lib/blog-markdown";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Post, Profile } from "@/lib/types";

type BlogPostCard = Post & {
  author: Profile | null;
};

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

function getAuthorName(author: Profile | null) {
  return author?.full_name?.trim() || author?.title?.trim() || "NOMAD-GO 作者";
}

async function getPublishedPosts() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return [] as BlogPostCard[];
  }

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("is_published", true)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[blog] Failed to load published posts.", error);
    return [] as BlogPostCard[];
  }

  const posts = (data ?? []) as Post[];
  const authorIds = Array.from(new Set(posts.map((post) => post.author_id)));
  const authorById = new Map<string, Profile>();

  if (authorIds.length > 0) {
    const { data: authors } = await supabase
      .from("profiles")
      .select("*")
      .in("id", authorIds);

    ((authors ?? []) as Profile[]).forEach((author) => {
      authorById.set(author.id, author);
    });
  }

  return posts.map((post) => ({
    ...post,
    author: authorById.get(post.author_id) ?? null
  }));
}

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <main className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Nomad Column
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
            遊牧專欄
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            由遠端工作者與數位遊牧者分享城市生活、咖啡廳推薦、工具清單與跨境工作心得。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {posts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.id}
                className="flex min-h-[430px] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {post.cover_image_url ? (
                  <div
                    className="h-48 bg-slate-100 bg-cover bg-center"
                    style={{ backgroundImage: `url(${post.cover_image_url})` }}
                    aria-label={`${post.title} 封面圖`}
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-emerald-50 text-emerald-700">
                    <PenLine className="h-9 w-9" aria-hidden="true" />
                  </div>
                )}

                <div className="flex flex-1 flex-col p-6">
                  <div className="flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h2 className="mt-4 text-xl font-semibold tracking-normal text-slate-950">
                    {post.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                    {getPostDescription(post.content, 120)}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-6 text-xs text-slate-500">
                    <span>{getAuthorName(post.author)}</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatDate(post.updated_at)}
                    </span>
                  </div>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    閱讀文章
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-200">
            <PenLine className="mx-auto h-9 w-9 text-emerald-600" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-semibold text-slate-950">
              尚未有公開文章
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              等待第一位遊牧者發布城市心得與遠端生活觀察。
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
