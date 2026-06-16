"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bold,
  CheckCircle2,
  Code2,
  Eye,
  Heading3,
  ImageUp,
  List,
  Loader2,
  Plus,
  Save,
  UploadCloud,
  X,
  XCircle
} from "lucide-react";
import { saveAdminPost } from "@/app/admin/posts/actions";
import { saveNomadPost } from "@/app/dashboard/nomad/posts/actions";
import { supabase } from "@/lib/supabase/client";
import type { Post } from "@/lib/types";

type Toast = {
  type: "success" | "error";
  message: string;
};

type EditorMode = "markdown" | "html";

type PostWithVirtualAuthor = Post & {
  is_official?: boolean | null;
};

export type PostAuthorOption = {
  id: string;
  name: string;
  title: string | null;
  avatarUrl: string | null;
  isVirtual: boolean;
};

type PostEditorFormProps = {
  post?: PostWithVirtualAuthor | null;
  variant?: "nomad" | "admin";
  authorOptions?: PostAuthorOption[];
};

const publicAssetsBucket = "public-assets";
const coverMaxFileSize = 8 * 1024 * 1024;
const supportedCoverTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const htmlTagPattern =
  /<\/?(?:article|aside|blockquote|br|code|div|em|figcaption|figure|h[1-6]|hr|iframe|img|li|ol|p|pre|section|span|strong|table|tbody|td|th|thead|tr|ul|a|b|i)\b[^>]*>/i;

const postCategoryOptions = [
  { value: "general", label: "一般專欄" },
  { value: "city_guide", label: "城市指南" },
  { value: "career", label: "職涯發展" },
  { value: "nomad_life", label: "遊牧生活" }
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return "發生未知錯誤，請稍後再試。";
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "jpg";
}

function formatTags(tags: string[] | null | undefined) {
  return tags?.filter(Boolean) ?? [];
}

function getInitialEditorMode(content: string): EditorMode {
  return htmlTagPattern.test(content) ? "html" : "markdown";
}

export default function PostEditorForm({
  post,
  variant = "nomad",
  authorOptions = []
}: PostEditorFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isAdminVariant = variant === "admin";
  const initialContent = post?.content ?? "";
  const initialAuthorId = post?.author_id ?? authorOptions[0]?.id ?? "";
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [category, setCategory] = useState(post?.category ?? "general");
  const [content, setContent] = useState(initialContent);
  const [editorMode, setEditorMode] = useState<EditorMode>(
    getInitialEditorMode(initialContent)
  );
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image_url ?? "");
  const [tags, setTags] = useState<string[]>(formatTags(post?.tags));
  const [tagInput, setTagInput] = useState("");
  const [selectedAuthorId, setSelectedAuthorId] = useState(initialAuthorId);
  const [isOfficial, setIsOfficial] = useState(post?.is_official ?? isAdminVariant);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<"draft" | "publish" | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(nextToast: Toast) {
    setToast(nextToast);
  }

  function addTag() {
    const nextTag = tagInput.trim();

    if (!nextTag || tags.includes(nextTag)) {
      setTagInput("");
      return;
    }

    setTags((currentTags) => [...currentTags, nextTag].slice(0, 12));
    setTagInput("");
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }

    if (event.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags((currentTags) => currentTags.slice(0, -1));
    }
  }

  async function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!supportedCoverTypes.has(file.type)) {
      showToast({
        type: "error",
        message: "封面圖僅支援 JPG、PNG 或 WebP。"
      });
      return;
    }

    if (file.size > coverMaxFileSize) {
      showToast({
        type: "error",
        message: "封面圖請小於 8MB。"
      });
      return;
    }

    if (!supabase) {
      showToast({
        type: "error",
        message: "尚未設定 Supabase，無法上傳封面圖。"
      });
      return;
    }

    try {
      setIsUploadingCover(true);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error("請先登入會員中心。");
      }

      const extension = getFileExtension(file.name);
      const filePath = `posts/${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(publicAssetsBucket)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from(publicAssetsBucket).getPublicUrl(filePath);
      setCoverImageUrl(data.publicUrl);
      showToast({
        type: "success",
        message: "封面圖已上傳。"
      });
    } catch (error) {
      showToast({
        type: "error",
        message: `封面圖上傳失敗：${getErrorMessage(error)}`
      });
    } finally {
      setIsUploadingCover(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function insertMarkdown(before: string, after = "", placeholder = "") {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.slice(start, end);
    const insertedText = selectedText
      ? `${before}${selectedText}${after}`
      : `${before}${placeholder}${after}`;

    textarea.setRangeText(insertedText, start, end, "end");
    setContent(textarea.value);
    textarea.focus();
  }

  function insertHtmlSnippet(before: string, after = "", placeholder = "") {
    insertMarkdown(before, after, placeholder);
    setEditorMode("html");
  }

  function insertBulletList() {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.slice(start, end);
    const insertedText = selectedText
      ? selectedText
          .split("\n")
          .map((line) => (line.trim() ? `- ${line.replace(/^[-*•]\s+/, "")}` : line))
          .join("\n")
      : "- 請輸入項目";

    textarea.setRangeText(insertedText, start, end, "end");
    setContent(textarea.value);
    textarea.focus();
  }

  function submitPost(form: HTMLFormElement, intent: "draft" | "publish") {
    const formData = new FormData(form);
    formData.set("is_published", intent === "publish" ? "true" : "false");
    formData.set("is_official", isOfficial ? "true" : "false");
    setPendingIntent(intent);

    startTransition(() => {
      const savePost = isAdminVariant ? saveAdminPost : saveNomadPost;

      void savePost(formData)
        .then((result) => {
          if (!result.ok) {
            showToast({
              type: "error",
              message: result.message
            });
            return;
          }

          showToast({
            type: "success",
            message: result.message
          });

          if (!post && result.postId && !isAdminVariant) {
            router.push(`/dashboard/nomad/posts/${result.postId}/edit`);
          } else {
            router.refresh();
          }
        })
        .catch((error: unknown) => {
          showToast({
            type: "error",
            message: getErrorMessage(error)
          });
        })
        .finally(() => setPendingIntent(null));
    });
  }

  const isSavingDraft = isPending && pendingIntent === "draft";
  const isPublishing = isPending && pendingIntent === "publish";

  return (
    <div className="space-y-5">
      {toast ? (
        <div
          className={`fixed bottom-5 right-5 z-[90] flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
          role="status"
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <span>{toast.message}</span>
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitPost(event.currentTarget, "draft");
        }}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <input type="hidden" name="post_id" value={post?.id ?? ""} />
        <input type="hidden" name="cover_image_url" value={coverImageUrl} />
        <input type="hidden" name="tags" value={tags.join(",")} />
        {isAdminVariant ? (
          <input type="hidden" name="selected_author_id" value={selectedAuthorId} />
        ) : null}

        <section className="space-y-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-emerald-100">
          <label className="block">
            <span className="text-sm font-medium text-slate-900">文章標題</span>
            <input
              name="title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：清邁最適合遠端工作的咖啡廳清單"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-900">
              自訂網址 (Slug)
            </span>
            <div className="mt-2 flex overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
              <span className="inline-flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-500">
                /blog/
              </span>
              <input
                name="slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="2026-hokkaido-nomad-guide"
                className="min-w-0 flex-1 px-3 py-2 text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              建議使用簡短英文、數字與橫線。未填寫時會自動產生安全網址。
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-900">文章分類</span>
            <select
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              {postCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium text-slate-900">內文編輯器</span>
              <div className="inline-grid w-full rounded-lg bg-slate-100 p-1 sm:w-auto sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setEditorMode("markdown")}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    editorMode === "markdown"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Heading3 className="h-3.5 w-3.5" aria-hidden="true" />
                  Markdown
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode("html")}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    editorMode === "html"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                  HTML 原始碼
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 rounded-t-lg border border-b-0 border-slate-200 bg-slate-50 px-3 py-2">
              {editorMode === "markdown" ? (
                <>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("### ", "", "小標題")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                  >
                    <Heading3 className="h-3.5 w-3.5" aria-hidden="true" />
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("**", "**", "重點文字")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                  >
                    <Bold className="h-3.5 w-3.5" aria-hidden="true" />
                    粗體
                  </button>
                  <button
                    type="button"
                    onClick={insertBulletList}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                  >
                    <List className="h-3.5 w-3.5" aria-hidden="true" />
                    項目符號
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => insertHtmlSnippet("<h2>", "</h2>", "小標題")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                  >
                    <Heading3 className="h-3.5 w-3.5" aria-hidden="true" />
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlSnippet("<strong>", "</strong>", "重點文字")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                  >
                    <Bold className="h-3.5 w-3.5" aria-hidden="true" />
                    strong
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertHtmlSnippet(
                        '<a href="https://example.com">',
                        "</a>",
                        "連結文字"
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                  >
                    <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                    a
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertHtmlSnippet(
                        '<img src="https://example.com/image.jpg" alt="圖片說明" />'
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                  >
                    <ImageUp className="h-3.5 w-3.5" aria-hidden="true" />
                    img
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertHtmlSnippet(
                        '<iframe src="https://www.youtube.com/embed/VIDEO_ID" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                  >
                    <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                    iframe
                  </button>
                </>
              )}
            </div>
            <textarea
              ref={textareaRef}
              name="content"
              required
              rows={18}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={
                editorMode === "html"
                  ? "<h2>城市觀察</h2><p>這裡放文章段落。</p>"
                  : "可使用 Markdown，例如：### 小標題、**重點文字**、- 項目符號、[連結文字](https://example.com)"
              }
              className={`w-full rounded-b-lg border border-slate-200 px-3 py-3 text-sm leading-7 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${
                editorMode === "html" ? "font-mono" : ""
              }`}
            />
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              {editorMode === "html"
                ? "HTML 原始碼模式。"
                : "支援 Markdown：H2/H3/H4、小標題、粗體、項目符號與連結。"}
            </span>
          </div>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {isAdminVariant ? (
            <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-cyan-100">
              <h2 className="font-semibold text-slate-900">發佈身分</h2>

              <div className="mt-4 grid gap-3">
                {authorOptions.map((author) => (
                  <label
                    key={author.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                      selectedAuthorId === author.id
                        ? "border-cyan-300 bg-cyan-50 ring-2 ring-cyan-100"
                        : "border-slate-200 bg-white hover:border-cyan-200"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={selectedAuthorId === author.id}
                      onChange={() => setSelectedAuthorId(author.id)}
                    />
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white bg-cover bg-center text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100"
                      style={
                        author.avatarUrl ? { backgroundImage: `url(${author.avatarUrl})` } : undefined
                      }
                    >
                      {author.avatarUrl ? null : author.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">
                        {author.name}
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">
                        {author.isVirtual ? "虛擬作者" : "管理員"} ·{" "}
                        {author.title ?? "NOMAD-GO 作者"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              {authorOptions.length === 0 ? (
                <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
                  尚未取得可用作者身分。
                </p>
              ) : null}

              <label className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={isOfficial}
                  onChange={(event) => setIsOfficial(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span>
                  <span className="block font-semibold text-slate-800">官方精選文章</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    勾選後會寫入 posts.is_official，供前台精選與營運排序使用。
                  </span>
                </span>
              </label>
            </section>
          ) : null}

          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-emerald-100">
            <div className="flex items-center gap-2">
              <ImageUp className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <h2 className="font-semibold text-slate-900">封面圖</h2>
            </div>

            {coverImageUrl ? (
              <div
                className="mt-4 h-36 rounded-lg bg-slate-100 bg-cover bg-center ring-1 ring-slate-200"
                style={{ backgroundImage: `url(${coverImageUrl})` }}
                aria-label="文章封面圖預覽"
              />
            ) : (
              <div className="mt-4 flex h-36 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400 ring-1 ring-slate-200">
                尚未上傳封面圖
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingCover}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-70"
            >
              {isUploadingCover ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
              )}
              {isUploadingCover ? "上傳中..." : "上傳封面圖"}
            </button>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-emerald-100">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">文章標籤</h2>
              <span className="text-xs text-slate-400">{tags.length}/12</span>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="咖啡廳、泰國、節稅"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={addTag}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTags((currentTags) => currentTags.filter((item) => item !== tag))}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100"
                  >
                    {tag}
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs leading-5 text-slate-500">
                加上 2-5 個標籤，能幫助文章被搜尋與分類。
              </p>
            )}
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-emerald-100">
            <h2 className="font-semibold text-slate-900">發布設定</h2>
            {post?.is_published ? (
              <p className="mt-2 text-sm text-emerald-700">目前狀態：已發布</p>
            ) : (
              <p className="mt-2 text-sm text-amber-700">目前狀態：草稿</p>
            )}

            <div className="mt-5 grid gap-3">
              <button
                type="submit"
                disabled={isPending || isUploadingCover}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
              >
                {isSavingDraft ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {isSavingDraft ? "儲存中..." : "儲存草稿"}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  if (event.currentTarget.form) {
                    submitPost(event.currentTarget.form, "publish");
                  }
                }}
                disabled={isPending || isUploadingCover}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
              >
                {isPublishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
                {isPublishing ? "發布中..." : "發布文章"}
              </button>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}
