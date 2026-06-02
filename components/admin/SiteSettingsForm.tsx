"use client";

import { ChangeEvent, FormEvent, useRef, useState, useTransition } from "react";
import { ImageUp, Loader2, Mail, Save } from "lucide-react";
import { updateFooterSettings, updateSiteSettings } from "@/app/admin/actions";
import { supabase } from "@/lib/supabase/client";
import type { SiteSettings } from "@/lib/types";

type SiteSettingsFormProps = {
  settings: SiteSettings;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type SocialLinks = {
  instagram: string;
  threads: string;
  linkedin: string;
  facebook: string;
};

function normalizeSocialLinks(value: SiteSettings["social_links"] | null | undefined): SocialLinks {
  return {
    instagram: value?.instagram ?? "",
    threads: value?.threads ?? "",
    linkedin: value?.linkedin ?? "",
    facebook: value?.facebook ?? ""
  };
}

export default function SiteSettingsForm({ settings }: SiteSettingsFormProps) {
  const [toast, setToast] = useState<ToastState>(null);
  const [heroImageUrl, setHeroImageUrl] = useState(settings.hero_image_url);
  const [isUploading, setIsUploading] = useState(false);
  const [isHeroPending, startHeroTransition] = useTransition();
  const [isFooterPending, startFooterTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socialLinks = normalizeSocialLinks(settings.social_links);

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

  function handleHeroSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);

    const formData = new FormData(event.currentTarget);

    startHeroTransition(async () => {
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

  function handleFooterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);

    const formData = new FormData(event.currentTarget);

    startFooterTransition(async () => {
      const result = await updateFooterSettings(formData);

      setToast({
        type: result.ok ? "success" : "error",
        message: result.message
      });
    });
  }

  return (
    <div className="mt-8 space-y-8">
      {toast ? (
        <div
          className={`fixed bottom-5 right-5 z-[90] rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}

      <form onSubmit={handleHeroSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">首頁 Hero 設定</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              管理首頁第一屏的主文案與背景圖。
            </p>
          </div>

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
                    disabled={isUploading || isHeroPending}
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

          <button
            type="submit"
            disabled={isHeroPending || isUploading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isHeroPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {isHeroPending ? "儲存中..." : "儲存首頁設定"}
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

      <form
        onSubmit={handleFooterSubmit}
        className="grid gap-6 border-t border-gray-100 pt-8 lg:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Footer 全站設定</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              管理前台 Footer 的平台簡介、聯絡信箱與社群連結。此區塊僅限 Super Admin 更新。
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-900">Footer 平台簡介</span>
            <textarea
              name="footer_description"
              rows={4}
              required
              defaultValue={settings.footer_description}
              placeholder="輸入 Footer 顯示的平台簡介"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-900">聯絡信箱</span>
            <input
              name="contact_email"
              type="email"
              required
              defaultValue={settings.contact_email}
              placeholder="hello@nomad-go.example"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div>
            <p className="text-sm font-medium text-gray-900">社群連結</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <input
                name="social_instagram"
                defaultValue={socialLinks.instagram}
                placeholder="Instagram URL"
                className="rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              <input
                name="social_threads"
                defaultValue={socialLinks.threads}
                placeholder="Threads URL"
                className="rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              <input
                name="social_linkedin"
                defaultValue={socialLinks.linkedin}
                placeholder="LinkedIn URL"
                className="rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              <input
                name="social_facebook"
                defaultValue={socialLinks.facebook}
                placeholder="Facebook URL"
                className="rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isFooterPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isFooterPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {isFooterPending ? "儲存中..." : "儲存 Footer 設定"}
          </button>
        </div>

        <aside className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-900">Footer 預覽重點</p>
          <div className="mt-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="text-base font-semibold text-gray-900">NOMAD-GO 遊牧出發</div>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              {settings.footer_description}
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-gray-500">
              <Mail className="h-4 w-4" aria-hidden="true" />
              {settings.contact_email}
            </p>
          </div>
          <p className="mt-3 text-xs leading-5 text-gray-500">
            儲存後會清除前台 Footer 快取，下一次載入前台頁面會顯示最新內容。
          </p>
        </aside>
      </form>
    </div>
  );
}
