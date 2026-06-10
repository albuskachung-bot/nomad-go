import BillingConsole from "@/components/admin/BillingConsole";
import { getCurrentAdminContext } from "@/lib/admin";
import {
  emptyPlatformApiSettings,
  normalizePlatformApiSettings,
  platformApiSettingKeys
} from "@/lib/platform-settings";
import type { Order } from "@/lib/types";

type BillingTransaction = {
  id: string;
  paidAt: string;
  company: string;
  taxId: string;
  plan: string;
  amount: string;
  status: string;
};

function formatTransactionDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei"
  }).format(new Date(value));
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0
  }).format(value);
}

function normalizeOrderStatus(status: string) {
  if (status === "paid") {
    return "Success";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "Pending";
}

function toBillingTransaction(order: Order): BillingTransaction {
  return {
    id: order.stripe_session_id,
    paidAt: formatTransactionDate(order.paid_at ?? order.created_at),
    company: order.company_name ?? "個人訂閱",
    taxId: order.tax_id ?? "N/A",
    plan: order.plan_name ?? order.product_type ?? "未設定",
    amount: formatAmount(order.amount),
    status: normalizeOrderStatus(order.status)
  };
}

export default async function AdminBillingPage() {
  const { supabase, isSuperAdmin } = await getCurrentAdminContext();
  let initialApiSettings = emptyPlatformApiSettings;
  let settingsLoadError: string | null = null;
  let transactions: BillingTransaction[] = [];

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

  if (supabase) {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/billing] Unable to load orders.", error);
    } else {
      transactions = ((data ?? []) as Order[]).map(toBillingTransaction);
    }
  }

  return (
    <BillingConsole
      initialApiSettings={initialApiSettings}
      canManageApiSettings={isSuperAdmin}
      settingsLoadError={settingsLoadError}
      transactions={transactions}
    />
  );
}
