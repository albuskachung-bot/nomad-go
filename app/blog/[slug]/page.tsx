import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, UserRound } from "lucide-react";
import AuthorBadge, { getPostAuthorDisplay } from "@/components/blog/AuthorBadge";
import {
  getPostDescription,
  isHtmlContent,
  renderMarkdownContent,
  sanitizePostHtml
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

function decodeSlugParam(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
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
  const decodedSlug = decodeSlugParam(slug);
  const detail = await getPublishedPostBySlug(decodedSlug);

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
  const decodedSlug = decodeSlugParam(slug);
  const detail = await getPublishedPostBySlug(decodedSlug);

  if (!detail) {
    notFound();
  }

  const { post, author } = detail;
  const authorDisplay = getPostAuthorDisplay(author);
  const shouldRenderHtml = isHtmlContent(post.content);
  const sanitizedHtml = shouldRenderHtml ? sanitizePostHtml(post.content) : "";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回遊牧專欄
        </Link>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-16">
          <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10 lg:col-span-8">
            <header>
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
                  {authorDisplay.profileHref ? (
                    <Link
                      href={authorDisplay.profileHref}
                      className="font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
                    >
                      {authorDisplay.name}
                    </Link>
                  ) : (
                    authorDisplay.name
                  )}
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {formatDate(post.updated_at)}
                </span>
              </div>
            </header>

            {post.cover_image_url ? (
              <div
                className="mt-8 h-64 rounded-2xl bg-slate-100 bg-cover bg-center shadow-sm ring-1 ring-slate-200 md:h-96"
                style={{ backgroundImage: `url(${post.cover_image_url})` }}
                aria-label={`${post.title} 封面圖`}
              />
            ) : null}

            {shouldRenderHtml ? (
              <div
                className="prose prose-emerald mt-10 max-w-none space-y-6 leading-loose prose-headings:tracking-normal prose-p:my-6 prose-p:leading-loose prose-li:leading-8 prose-img:rounded-xl prose-img:shadow-sm prose-iframe:aspect-video prose-iframe:w-full prose-iframe:rounded-xl"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            ) : (
              <div className="prose prose-emerald mt-10 max-w-none space-y-6 leading-loose prose-headings:tracking-normal prose-p:my-6 prose-p:leading-loose prose-li:leading-8">
                {renderMarkdownContent(post.content)}
              </div>
            )}
          </article>

          <aside className="lg:col-span-4">
            <div className="sticky top-24">
              <AuthorBadge author={author} />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
