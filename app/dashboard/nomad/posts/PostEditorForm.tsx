"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bold,
  CheckCircle2,
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
import { saveNomadPost } from "@/app/dashboard/nomad/posts/actions";
import { supabase } from "@/lib/supabase/client";
import type { Post } from "@/lib/types";

type Toast = {
  type: "success" | "error";
  message: string;
};

const publicAssetsBucket = "public-assets";
const coverMaxFileSize = 8 * 1024 * 1024;
const supportedCoverTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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

export default function PostEditorForm({ post }: { post?: Post | null }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image_url ?? "");
  const [tags, setTags] = useState<string[]>(formatTags(post?.tags));
  const [tagInput, setTagInput] = useState("");
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
    setPendingIntent(intent);

    startTransition(() => {
      void saveNomadPost(formData)
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

          if (!post && result.postId) {
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

          <div>
            <span className="text-sm font-medium text-slate-900">內文編輯器</span>
            <div className="mt-2 flex flex-wrap gap-2 rounded-t-lg border border-b-0 border-slate-200 bg-slate-50 px-3 py-2">
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
            </div>
            <textarea
              ref={textareaRef}
              name="content"
              required
              rows={18}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="可使用 Markdown，例如：### 小標題、**重點文字**、- 項目符號、[連結文字](https://example.com)"
              className="w-full rounded-b-lg border border-slate-200 px-3 py-3 text-sm leading-7 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              支援 Markdown：H2/H3/H4、小標題、粗體、項目符號與連結。
            </span>
          </div>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
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
