export const platformApiSettingKeys = [
  "payment_publishable_key",
  "payment_secret_key",
  "payment_webhook_secret",
  "einvoice_merchant_id",
  "einvoice_hash_key",
  "einvoice_hash_iv"
] as const;

export type PlatformApiSettingKey = (typeof platformApiSettingKeys)[number];

export type PlatformApiSettings = Record<PlatformApiSettingKey, string>;

export const emptyPlatformApiSettings: PlatformApiSettings = {
  payment_publishable_key: "",
  payment_secret_key: "",
  payment_webhook_secret: "",
  einvoice_merchant_id: "",
  einvoice_hash_key: "",
  einvoice_hash_iv: ""
};

export function normalizePlatformApiSettings(
  entries: Array<{ key_name: string; key_value: string | null }>
): PlatformApiSettings {
  const settings: PlatformApiSettings = {
    ...emptyPlatformApiSettings
  };

  entries.forEach((entry) => {
    if (platformApiSettingKeys.includes(entry.key_name as PlatformApiSettingKey)) {
      settings[entry.key_name as PlatformApiSettingKey] = entry.key_value ?? "";
    }
  });

  return settings;
}
