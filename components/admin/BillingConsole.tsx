"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Link2,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  TrendingUp,
  X
} from "lucide-react";
import { updatePlatformApiSettings } from "@/app/admin/actions";
import type {
  PlatformApiSettingKey,
  PlatformApiSettings
} from "@/lib/platform-settings";

type BillingTab = "transactions" | "invoices" | "gateway";
type InvoiceStatus = "Issued" | "Pending" | "Voided";
type Notice = {
  type: "success" | "error";
  message: string;
};

type Transaction = {
  id: string;
  paidAt: string;
  company: string;
  taxId: string;
  plan: string;
  amount: string;
  status: string;
};

type Invoice = {
  orderId: string;
  company: string;
  amount: string;
  invoiceNo: string | null;
  status: InvoiceStatus;
};

type BillingConsoleProps = {
  initialApiSettings: PlatformApiSettings;
  canManageApiSettings: boolean;
  settingsLoadError: string | null;
  transactions: Transaction[];
};

const tabs: Array<{ id: BillingTab; label: string; icon: typeof CreditCard }> = [
  { id: "transactions", label: "交易與訂閱紀錄", icon: CreditCard },
  { id: "invoices", label: "發票管理", icon: FileText },
  { id: "gateway", label: "金流與 API 狀態", icon: Activity }
];

const invoices: Invoice[] = [
  {
    orderId: "ORD-250527-0281",
    company: "Cloud Harbor 科技股份有限公司",
    amount: "NT$ 168,000",
    invoiceNo: "AB-98273140",
    status: "Issued"
  },
  {
    orderId: "ORD-250526-0274",
    company: "遠景人才顧問有限公司",
    amount: "NT$ 12,800",
    invoiceNo: "AB-98273138",
    status: "Issued"
  },
  {
    orderId: "ORD-250526-0270",
    company: "Nomad Stack Ltd.",
    amount: "NT$ 18,800",
    invoiceNo: null,
    status: "Pending"
  },
  {
    orderId: "ORD-250523-0256",
    company: "Async Finance 台灣分公司",
    amount: "NT$ 18,800",
    invoiceNo: "AB-98273092",
    status: "Voided"
  }
];

const transactionStyles: Record<string, string> = {
  Success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Failed: "bg-rose-50 text-rose-700 ring-rose-200",
  Refunded: "bg-amber-50 text-amber-700 ring-amber-200",
  Pending: "bg-slate-100 text-slate-600 ring-slate-200"
};

const invoiceStyles: Record<InvoiceStatus, string> = {
  Issued: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  Voided: "bg-slate-100 text-slate-600 ring-slate-200"
};

const invoiceLabels: Record<InvoiceStatus, string> = {
  Issued: "已開立 Issued",
  Pending: "待開立 Pending",
  Voided: "作廢 Voided"
};

export default function BillingConsole({
  initialApiSettings,
  canManageApiSettings,
  settingsLoadError,
  transactions
}: BillingConsoleProps) {
  const [activeTab, setActiveTab] = useState<BillingTab>("transactions");
  const [notice, setNotice] = useState<Notice | null>(null);

  function showMockNotice(action: string) {
    setNotice({
      type: "success",
      message: `${action}為介面預留操作，尚未呼叫正式金流或發票 API。`
    });
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[90] flex max-w-md items-start gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-xl ${
            notice.type === "success" ? "bg-slate-950" : "bg-rose-600"
          }`}
        >
          <CheckCircle2
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              notice.type === "success" ? "text-cyan-300" : "text-white"
            }`}
            aria-hidden="true"
          />
          <span className="leading-6">{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="關閉提示"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Billing &amp; Finance
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            財務與訂閱控制台
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            統一檢視訂閱交易、電子發票開立狀態與外部金流服務健康度。
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 ring-1 ring-cyan-100">
          Live transactions / Sandbox APIs
        </span>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              +14 this month
            </span>
          </div>
          <p className="mt-5 text-sm font-medium text-slate-500">活躍訂閱企業數</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">246</p>
          <p className="mt-3 text-xs leading-5 text-slate-500">Pro 184 家 / VIP 62 家</p>
        </article>
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              Healthy
            </span>
          </div>
          <p className="mt-5 text-sm font-medium text-slate-500">本月交易成功率</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">98.7%</p>
          <p className="mt-3 text-xs leading-5 text-slate-500">1,142 successful / 15 failed attempts</p>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div
          className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 p-2"
          role="tablist"
          aria-label="財務管理功能"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                id={`billing-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`billing-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  selected
                    ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "transactions" ? (
          <TransactionsPanel
            transactions={transactions}
            onDownload={() => showMockNotice("下載對帳單")}
          />
        ) : null}
        {activeTab === "invoices" ? (
          <InvoicesPanel onManualIssue={() => showMockNotice("手動補開發票")} />
        ) : null}
        {activeTab === "gateway" ? (
          <GatewayPanel
            initialSettings={initialApiSettings}
            canManage={canManageApiSettings}
            loadError={settingsLoadError}
            onTestWebhook={() => showMockNotice("Webhooks 測試")}
            onSaved={(ok, message) =>
              setNotice({
                type: ok ? "success" : "error",
                message
              })
            }
          />
        ) : null}
      </section>
    </div>
  );
}

function TransactionsPanel({
  transactions,
  onDownload
}: {
  transactions: Transaction[];
  onDownload: () => void;
}) {
  return (
    <div
      id="billing-panel-transactions"
      role="tabpanel"
      aria-labelledby="billing-tab-transactions"
      className="p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">交易與訂閱紀錄</h2>
          <p className="mt-1 text-sm text-slate-500">
            最近完成的訂閱扣款與退款紀錄，包含開票買方資料。
          </p>
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          下載對帳單
        </button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">交易時間</th>
              <th className="px-5 py-4">企業名稱</th>
              <th className="px-5 py-4">買方統編 / 抬頭 (Tax ID)</th>
              <th className="px-5 py-4">訂閱方案</th>
              <th className="px-5 py-4">金額</th>
              <th className="px-5 py-4">交易狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="transition hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                  <div>{transaction.paidAt}</div>
                  <div className="mt-1 text-xs text-slate-400">{transaction.id}</div>
                </td>
                <td className="px-5 py-4 font-medium text-slate-900">{transaction.company}</td>
                <td className="px-5 py-4 text-slate-600">{transaction.taxId}</td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{transaction.plan}</td>
                <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">
                  {transaction.amount}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                      transactionStyles[transaction.status] ?? transactionStyles.Pending
                    }`}
                  >
                    {transaction.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">目前沒有交易紀錄。</p>
        ) : null}
      </div>
    </div>
  );
}

function InvoicesPanel({ onManualIssue }: { onManualIssue: () => void }) {
  return (
    <div
      id="billing-panel-invoices"
      role="tabpanel"
      aria-labelledby="billing-tab-invoices"
      className="p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">發票管理</h2>
          <p className="mt-1 text-sm text-slate-500">
            核對付款訂單的電子發票生命週期與補開需求。
          </p>
        </div>
        <button
          type="button"
          onClick={onManualIssue}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          手動補開發票
        </button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">關聯訂單號</th>
              <th className="px-5 py-4">企業名稱</th>
              <th className="px-5 py-4">開立金額</th>
              <th className="px-5 py-4">發票號碼 (Invoice No.)</th>
              <th className="px-5 py-4">發票狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((invoice) => (
              <tr key={invoice.orderId} className="transition hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                  {invoice.orderId}
                </td>
                <td className="px-5 py-4 text-slate-700">{invoice.company}</td>
                <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">
                  {invoice.amount}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                  {invoice.invoiceNo ?? "待金流確認後配號"}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${invoiceStyles[invoice.status]}`}
                  >
                    {invoiceLabels[invoice.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">目前沒有待處理發票。</p>
        ) : null}
      </div>
    </div>
  );
}

const paymentFields: Array<{
  key: PlatformApiSettingKey;
  label: string;
  placeholder: string;
  secret?: boolean;
}> = [
  {
    key: "payment_publishable_key",
    label: "Publishable Key",
    placeholder: "pk_live_..."
  },
  {
    key: "payment_secret_key",
    label: "Secret Key",
    placeholder: "sk_live_...",
    secret: true
  },
  {
    key: "payment_webhook_secret",
    label: "Webhook Secret",
    placeholder: "whsec_...",
    secret: true
  }
];

const invoiceProviderFields: Array<{
  key: PlatformApiSettingKey;
  label: string;
  placeholder: string;
  secret?: boolean;
}> = [
  {
    key: "einvoice_merchant_id",
    label: "MerchantID",
    placeholder: "2000..."
  },
  {
    key: "einvoice_hash_key",
    label: "HashKey",
    placeholder: "HashKey",
    secret: true
  },
  {
    key: "einvoice_hash_iv",
    label: "HashIV",
    placeholder: "HashIV",
    secret: true
  }
];

function GatewayPanel({
  initialSettings,
  canManage,
  loadError,
  onTestWebhook,
  onSaved
}: {
  initialSettings: PlatformApiSettings;
  canManage: boolean;
  loadError: string | null;
  onTestWebhook: () => void;
  onSaved: (ok: boolean, message: string) => void;
}) {
  const [settings, setSettings] = useState<PlatformApiSettings>(initialSettings);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const paymentConfigured = paymentFields.every((field) => settings[field.key].length > 0);
  const invoiceConfigured = invoiceProviderFields.every((field) => settings[field.key].length > 0);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  function updateField(key: PlatformApiSettingKey, value: string) {
    setSettings((current) => ({
      ...current,
      [key]: value
    }));
  }

  function toggleSecretVisibility(key: PlatformApiSettingKey) {
    setVisibleSecrets((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) {
      onSaved(false, "只有 Super Admin 可以更新金流與發票 API 設定。");
      return;
    }

    const formData = new FormData();

    Object.entries(settings).forEach(([key, value]) => {
      formData.set(key, value);
    });

    startTransition(async () => {
      const result = await updatePlatformApiSettings(formData);
      onSaved(result.ok, result.message);
    });
  }

  return (
    <div
      id="billing-panel-gateway"
      role="tabpanel"
      aria-labelledby="billing-tab-gateway"
      className="p-5 sm:p-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-950">金流與 API 狀態</h2>
        <p className="mt-1 text-sm text-slate-500">
          管理金流與電子發票 API 憑證。Secret 欄位預設隱藏，僅限 Super Admin 讀寫。
        </p>
      </div>

      {loadError ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">設定讀取提醒</p>
              <p className="mt-1">{loadError}</p>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <CredentialCard
            title="金流服務 (Payment Gateway)"
            description="Stripe / ECPay API 憑證與 webhook 驗證密鑰。"
            configured={paymentConfigured}
            fields={paymentFields}
            settings={settings}
            visibleSecrets={visibleSecrets}
            disabled={!canManage || isPending}
            onChange={updateField}
            onToggleSecret={toggleSecretVisibility}
            footer={
              <button
                type="button"
                onClick={onTestWebhook}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Webhooks 測試
              </button>
            }
          />

          <CredentialCard
            title="電子發票加值中心"
            description="電子發票服務 MerchantID、HashKey 與 HashIV。"
            configured={invoiceConfigured}
            fields={invoiceProviderFields}
            settings={settings}
            visibleSecrets={visibleSecrets}
            disabled={!canManage || isPending}
            onChange={updateField}
            onToggleSecret={toggleSecretVisibility}
            footer={
              <div className="rounded-lg bg-slate-950 p-3 text-xs leading-6 text-slate-200">
                <div className="flex items-center gap-2 text-slate-400">
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  Sensitive credentials are stored in platform_settings.
                </div>
              </div>
            }
          />
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            Secret 欄位會寫入 Supabase `platform_settings`，並由 RLS 限制只有 super_admin 可讀寫。請避免在客服截圖或公開環境中顯示密鑰。
          </p>
          <button
            type="submit"
            disabled={!canManage || isPending}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {isPending ? "儲存中..." : "儲存設定"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CredentialCard({
  title,
  description,
  configured,
  fields,
  settings,
  visibleSecrets,
  disabled,
  onChange,
  onToggleSecret,
  footer
}: {
  title: string;
  description: string;
  configured: boolean;
  fields: Array<{
    key: PlatformApiSettingKey;
    label: string;
    placeholder: string;
    secret?: boolean;
  }>;
  settings: PlatformApiSettings;
  visibleSecrets: Record<string, boolean>;
  disabled: boolean;
  onChange: (key: PlatformApiSettingKey, value: string) => void;
  onToggleSecret: (key: PlatformApiSettingKey) => void;
  footer: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            configured
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              configured ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          {configured ? "Configured" : "Incomplete"}
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {fields.map((field) => {
          const isVisible = Boolean(visibleSecrets[field.key]);
          const inputType = field.secret && !isVisible ? "password" : "text";

          return (
            <label key={field.key} className="block">
              <span className="text-sm font-medium text-slate-900">{field.label}</span>
              <span className="mt-2 flex rounded-lg border border-slate-200 bg-white shadow-sm focus-within:border-cyan-600 focus-within:ring-2 focus-within:ring-cyan-100">
                <input
                  type={inputType}
                  value={settings[field.key]}
                  disabled={disabled}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  autoComplete="new-password"
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-lg border-0 bg-transparent px-3 py-3 font-mono text-sm text-slate-900 outline-none placeholder:font-sans placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {field.secret ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggleSecret(field.key)}
                    className="inline-flex w-11 items-center justify-center rounded-r-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={isVisible ? `隱藏 ${field.label}` : `顯示 ${field.label}`}
                  >
                    {isVisible ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-5">{footer}</div>
    </article>
  );
}
