import BillingConsole from "@/components/admin/BillingConsole";
import { getCurrentAdminContext } from "@/lib/admin";
import {
  emptyPlatformApiSettings,
  normalizePlatformApiSettings,
  platformApiSettingKeys
} from "@/lib/platform-settings";

export default async function AdminBillingPage() {
  const { supabase, isSuperAdmin } = await getCurrentAdminContext();
  let initialApiSettings = emptyPlatformApiSettings;
  let settingsLoadError: string | null = null;

  if (!isSuperAdmin) {
    settingsLoadError = "只有 Super Admin 可以讀取與修改 API 憑證。";
  } else if (!supabase) {
    settingsLoadError = "尚未設定 Supabase 環境變數，無法讀取 API 憑證。";
  } else {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("key_name, key_value")
      .in("key_name", [...platformApiSettingKeys]);

    if (error) {
      settingsLoadError = error.message;
    } else {
      initialApiSettings = normalizePlatformApiSettings(data ?? []);
    }
  }

  return (
    <BillingConsole
      initialApiSettings={initialApiSettings}
      canManageApiSettings={isSuperAdmin}
      settingsLoadError={settingsLoadError}
    />
  );
}
