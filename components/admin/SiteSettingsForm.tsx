"use client";

import { ChangeEvent, FormEvent, useRef, useState, useTransition } from "react";
import { ImageUp, Loader2, Save } from "lucide-react";
import { updateSiteSettings } from "@/app/admin/actions";
import { supabase } from "@/lib/supabase/client";
import type { SiteSettings } from "@/lib/types";

type SiteSettingsFormProps = {
  settings: SiteSettings;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

export default function SiteSettingsForm({ settings }: SiteSettingsFormProps) {
  const [toast, setToast] = useState<ToastState>(null);
  const [heroImageUrl, setHeroImageUrl] = useState(settings.hero_image_url);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!supabase) {
      setToast({
        type: "error",
        message: "缺少 Supabase 環境變數，無法上傳圖片。"
      });
      return;
    }

    setIsUploading(true);
    setToast(null);

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filePath = `hero/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("public-assets").upload(filePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    });

    if (error) {
      setToast({
        type: "error",
        message: error.message
      });
      setIsUploading(false);
      return;
    }

    const { data } = supabase.storage.from("public-assets").getPublicUrl(filePath);

    setHeroImageUrl(data.publicUrl);
    setIsUploading(false);
    setToast({
      type: "success",
      message: "圖片已上傳，請儲存設定讓首頁套用新背景。"
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateSiteSettings(formData);

      setToast({
        type: result.ok ? "success" : "error",
        message: result.message
      });

      if (result.ok && fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <input
          type="hidden"
          name="current_hero_image_url"
          value={heroImageUrl}
          readOnly
        />

        <label className="block">
          <span className="text-sm font-medium text-gray-900">主標題</span>
          <input
            name="hero_title"
            defaultValue={settings.hero_title}
            placeholder="NOMAD-GO 遊牧出發"
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-900">副標題</span>
          <textarea
            name="hero_subtitle"
            rows={5}
            defaultValue={settings.hero_subtitle}
            placeholder="輸入首頁 Hero 的描述文字"
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-900">背景圖片上傳</span>
          <div className="mt-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                <ImageUp className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  name="hero_image"
                  accept="image/*"
                  disabled={isUploading || isPending}
                  onChange={handleImageUpload}
                  className="w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  請先在 Supabase Storage 建立公開 Bucket：public-assets。選擇圖片後會立即上傳，儲存後套用到首頁。
                </p>
                {isUploading ? (
                  <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-blue-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    圖片上傳中...
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </label>

        {toast ? (
          <div
            className={`fixed bottom-5 right-5 z-[90] rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
              toast.type === "success"
                ? "bg-emerald-600"
                : "bg-rose-600"
            }`}
          >
            {toast.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending || isUploading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          {isPending ? "儲存中..." : "儲存首頁設定"}
        </button>
      </div>

      <aside className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm font-semibold text-gray-900">目前背景圖預覽</p>
        <div
          className="mt-3 aspect-[4/3] rounded-lg bg-cover bg-center shadow-sm ring-1 ring-gray-100"
          style={{ backgroundImage: `url('${heroImageUrl}')` }}
          aria-hidden="true"
        />
        <p className="mt-3 break-all text-xs leading-5 text-gray-500">{heroImageUrl}</p>
      </aside>
    </form>
  );
}
