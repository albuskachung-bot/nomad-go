import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, PenLine, UserRound } from "lucide-react";
import {
  getPostDescription,
  renderMarkdownContent
} from "@/lib/blog-markdown";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Post, Profile } from "@/lib/types";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type BlogPostDetail = {
  post: Post;
  author: Profile | null;
};

export const dynamic = "force-dynamic";

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  );
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

function getAuthorName(author: Profile | null) {
  return author?.full_name?.trim() || author?.title?.trim() || "NOMAD-GO 作者";
}

function getAuthorTitle(author: Profile | null) {
  return author?.job_title?.trim() || author?.title?.trim() || "遠端工作者";
}

async function getPublishedPostBySlug(slug: string): Promise<BlogPostDetail | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("[blog/detail] Failed to load post.", error);
    return null;
  }

  const post = (data as Post | null) ?? null;

  if (!post) {
    return null;
  }

  const { data: authorData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", post.author_id)
    .maybeSingle();

  return {
    post,
    author: (authorData as Profile | null) ?? null
  };
}

export async function generateMetadata({
  params
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getPublishedPostBySlug(slug);

  if (!detail) {
    return {
      title: "找不到文章 | NOMAD-GO 遊牧專欄"
    };
  }

  const { post } = detail;
  const siteUrl = getSiteUrl();
  const description = getPostDescription(post.content, 150);
  const title = `${post.title} | NOMAD-GO 遊牧專欄`;
  const url = siteUrl ? `${siteUrl.replace(/\/$/, "")}/blog/${post.slug}` : undefined;
  const images = post.cover_image_url ? [post.cover_image_url] : undefined;

  return {
    title,
    description,
    alternates: url
      ? {
          canonical: url
        }
      : undefined,
    openGraph: {
      title,
      description,
      type: "article",
      url,
      images
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images
    }
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const detail = await getPublishedPostBySlug(slug);

  if (!detail) {
    notFound();
  }

  const { post, author } = detail;

  return (
    <main className="bg-slate-50">
      <article>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              返回遊牧專欄
            </Link>

            <div className="mt-8">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
                {post.title}
              </h1>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  {getAuthorName(author)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {formatDate(post.updated_at)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {post.cover_image_url ? (
          <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
            <div
              className="h-64 rounded-2xl bg-slate-100 bg-cover bg-center shadow-sm ring-1 ring-slate-200 md:h-96"
              style={{ backgroundImage: `url(${post.cover_image_url})` }}
              aria-label={`${post.title} 封面圖`}
            />
          </div>
        ) : null}

        <section className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-8">
          <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200 sm:p-9">
            <div className="prose prose-emerald max-w-none prose-headings:tracking-normal prose-p:leading-8 prose-li:leading-7">
              {renderMarkdownContent(post.content)}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              {author?.avatar_url ? (
                <div
                  className="h-14 w-14 rounded-xl bg-slate-100 bg-cover bg-center ring-1 ring-slate-200"
                  style={{ backgroundImage: `url(${author.avatar_url})` }}
                  aria-label={`${getAuthorName(author)} 頭像`}
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <PenLine className="h-6 w-6" aria-hidden="true" />
                </span>
              )}
              <h2 className="mt-4 text-base font-semibold text-slate-950">
                {getAuthorName(author)}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{getAuthorTitle(author)}</p>
              {author ? (
                <Link
                  href={`/talents/${author.id}`}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                >
                  查看作者個人頁
                </Link>
              ) : null}
            </div>
          </aside>
        </section>
      </article>
    </main>
  );
}
