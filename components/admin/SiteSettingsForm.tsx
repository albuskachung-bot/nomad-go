"use client";

import { FormEvent, useState, useTransition } from "react";
import { Loader2, Mail, Save } from "lucide-react";
import { updateFooterSettings } from "@/app/admin/actions";
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
  const [isFooterPending, startFooterTransition] = useTransition();
  const socialLinks = normalizeSocialLinks(settings.social_links);

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

      <form
        onSubmit={handleFooterSubmit}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
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
