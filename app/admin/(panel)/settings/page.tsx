import { Image as ImageIcon, ShieldAlert } from "lucide-react";
import SiteSettingsForm from "@/components/admin/SiteSettingsForm";
import { canManageSiteSettings } from "@/lib/admin-auth";
import { getCurrentAdminContext } from "@/lib/admin";
import { mockSiteSettings } from "@/lib/data";

export default async function AdminSettingsPage() {
  const { supabase, profile } = await getCurrentAdminContext();
  const canManageSettings = canManageSiteSettings(profile?.role);
  const settings = supabase
    ? await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle()
        .then((result) =>
          result.data
            ? {
                ...mockSiteSettings,
                ...result.data,
                id: Number(result.data.id ?? 1)
              }
            : mockSiteSettings
        )
    : mockSiteSettings;

  if (!canManageSettings) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-amber-50 p-2 text-amber-700">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Permission Required
            </p>
            <h1 className="text-3xl font-semibold tracking-normal text-gray-900">
              無法存取全站設定
            </h1>
          </div>
        </div>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-gray-500">
          此頁面僅限 Super Admin 修改。Reviewer 與 Editor 可依職責管理內容流程，但不能變更全站品牌、Footer 與聯絡資訊。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
          <ImageIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Site CMS
          </p>
          <h1 className="text-3xl font-semibold tracking-normal text-gray-900">
            全站設定 CMS
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            修改 Footer 平台簡介、聯絡信箱與社群連結。首頁 Hero Banner 請至全站動態版位管理。
          </p>
        </div>
      </div>

      <SiteSettingsForm settings={settings} />
    </div>
  );
}
