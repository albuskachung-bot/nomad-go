"use client";

import { useState } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  KeyRound,
  Link2,
  Plus,
  TrendingUp,
  X
} from "lucide-react";

type BillingTab = "transactions" | "invoices" | "gateway";
type TransactionStatus = "Success" | "Failed" | "Refunded";
type InvoiceStatus = "Issued" | "Pending" | "Voided";

type Transaction = {
  id: string;
  paidAt: string;
  company: string;
  taxId: string;
  plan: string;
  amount: string;
  status: TransactionStatus;
};

type Invoice = {
  orderId: string;
  company: string;
  amount: string;
  invoiceNo: string | null;
  status: InvoiceStatus;
};

const tabs: Array<{ id: BillingTab; label: string; icon: typeof CreditCard }> = [
  { id: "transactions", label: "交易與訂閱紀錄", icon: CreditCard },
  { id: "invoices", label: "發票管理", icon: FileText },
  { id: "gateway", label: "金流與 API 狀態", icon: Activity }
];

const transactions: Transaction[] = [
  {
    id: "TXN-20260527-0281",
    paidAt: "2026/05/27 10:42",
    company: "Cloud Harbor 科技股份有限公司",
    taxId: "83124790 / Cloud Harbor",
    plan: "VIP Annual",
    amount: "NT$ 168,000",
    status: "Success"
  },
  {
    id: "TXN-20260526-0274",
    paidAt: "2026/05/26 16:18",
    company: "遠景人才顧問有限公司",
    taxId: "54398216 / 遠景人才",
    plan: "Pro Monthly",
    amount: "NT$ 12,800",
    status: "Success"
  },
  {
    id: "TXN-20260525-0269",
    paidAt: "2026/05/25 09:03",
    company: "Orbit Workspaces Inc.",
    taxId: "N/A / Orbit Workspaces",
    plan: "Pro Monthly",
    amount: "NT$ 12,800",
    status: "Failed"
  },
  {
    id: "TXN-20260523-0256",
    paidAt: "2026/05/23 14:31",
    company: "Async Finance 台灣分公司",
    taxId: "90246815 / Async Finance",
    plan: "VIP Monthly",
    amount: "NT$ 18,800",
    status: "Refunded"
  }
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

const transactionStyles: Record<TransactionStatus, string> = {
  Success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Failed: "bg-rose-50 text-rose-700 ring-rose-200",
  Refunded: "bg-amber-50 text-amber-700 ring-amber-200"
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

export default function BillingConsole() {
  const [activeTab, setActiveTab] = useState<BillingTab>("transactions");
  const [notice, setNotice] = useState<string | null>(null);

  function showMockNotice(action: string) {
    setNotice(`${action}為介面預留操作，尚未呼叫正式金流或發票 API。`);
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-[90] flex max-w-md items-start gap-3 rounded-xl bg-slate-950 px-4 py-3 text-sm text-white shadow-xl"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
          <span className="leading-6">{notice}</span>
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
          Finance sandbox / Mock data
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
          <TransactionsPanel onDownload={() => showMockNotice("下載對帳單")} />
        ) : null}
        {activeTab === "invoices" ? (
          <InvoicesPanel onManualIssue={() => showMockNotice("手動補開發票")} />
        ) : null}
        {activeTab === "gateway" ? (
          <GatewayPanel onTestWebhook={() => showMockNotice("Webhooks 測試")} />
        ) : null}
      </section>
    </div>
  );
}

function TransactionsPanel({ onDownload }: { onDownload: () => void }) {
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
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${transactionStyles[transaction.status]}`}
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

function GatewayPanel({ onTestWebhook }: { onTestWebhook: () => void }) {
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
          服務健康度為 sandbox 畫面資料；正式環境需由 heartbeat 與 webhook log 驗證。
        </p>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">金流服務 (Payment Gateway)</h3>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Connected
            </span>
          </div>
          <p className="mt-5 text-sm font-medium text-slate-800">
            Stripe / ECPay 連線正常
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
              <dt className="text-xs text-slate-500">Last heartbeat</dt>
              <dd className="mt-1 font-semibold text-slate-900">10:46:21 UTC+8</dd>
            </div>
            <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
              <dt className="text-xs text-slate-500">Webhook latency</dt>
              <dd className="mt-1 font-semibold text-slate-900">182 ms</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={onTestWebhook}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Webhooks 測試
          </button>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">電子發票加值中心</h3>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Connected
            </span>
          </div>
          <p className="mt-5 text-sm font-medium text-slate-800">
            E-Invoice Provider API 連線正常
          </p>
          <div className="mt-4 rounded-lg bg-slate-950 p-4 text-xs leading-7 text-slate-200">
            <div className="flex items-center gap-2 text-slate-400">
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              API credentials masked
            </div>
            <div className="mt-2 font-mono">MerchantID: 2000****</div>
            <div className="font-mono">HashKey: ****-****-****</div>
            <div className="font-mono">HashIV: ****-****</div>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            憑證只顯示隱碼；實際 secret 應由伺服器環境變數與權限控管保護。
          </p>
        </article>
      </div>
    </div>
  );
}
