"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { CheckCircle2, Copy, Link2, Loader2, Mail, ShieldAlert, UserPlus, XCircle } from "lucide-react";
import { createCompanyInvite } from "@/app/employer/team/actions";
import type { CompanyMemberRole } from "@/lib/types";

export type EmployerTeamMemberRow = {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: CompanyMemberRole;
  joinedAt: string;
};

type EmployerTeamClientProps = {
  companyName: string;
  canManageTeam: boolean;
  members: EmployerTeamMemberRow[];
  dataError: string | null;
};

type InviteTab = "link" | "email";
type Toast = {
  type: "success" | "error";
  message: string;
} | null;

const roleLabels: Record<CompanyMemberRole, string> = {
  admin: "Admin",
  recruiter: "Recruiter"
};

const roleBadgeStyles: Record<CompanyMemberRole, string> = {
  admin: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  recruiter: "bg-emerald-50 text-emerald-700 ring-emerald-100"
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function getInitials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "T";
}

function buildInviteUrl(token: string) {
  if (typeof window === "undefined") {
    return `/invite?token=${encodeURIComponent(token)}`;
  }

  return `${window.location.origin}/invite?token=${encodeURIComponent(token)}`;
}

export default function EmployerTeamClient({
  companyName,
  canManageTeam,
  members,
  dataError
}: EmployerTeamClientProps) {
  const [activeTab, setActiveTab] = useState<InviteTab>("link");
  const [email, setEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function handleGenerateLink() {
    if (!canManageTeam) {
      setToast({
        type: "error",
        message: "只有公司 Admin 可以產生邀請。"
      });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      const result = await createCompanyInvite(formData);

      if (!result.ok || !result.token) {
        setToast({
          type: "error",
          message: result.message
        });
        return;
      }

      setGeneratedLink(buildInviteUrl(result.token));
      setToast({
        type: "success",
        message: result.message
      });
    });
  }

  function handleEmailInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageTeam) {
      setToast({
        type: "error",
        message: "只有公司 Admin 可以發送邀請。"
      });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", email);
      const result = await createCompanyInvite(formData);

      if (!result.ok || !result.token) {
        setToast({
          type: "error",
          message: result.message
        });
        return;
      }

      setGeneratedLink(buildInviteUrl(result.token));
      setEmail("");
      setToast({
        type: "success",
        message: result.message
      });
    });
  }

  async function handleCopyLink() {
    if (!generatedLink) {
      return;
    }

    await navigator.clipboard.writeText(generatedLink);
    setToast({
      type: "success",
      message: "邀請連結已複製。"
    });
  }

  return (
    <div className="space-y-6">
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

      {dataError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">團隊資料讀取提醒</p>
              <p className="mt-1">{dataError}</p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">現有成員清單</h2>
              <p className="mt-1 text-sm text-slate-500">
                {companyName} 的協同招募成員與 workspace 權限。
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {members.length} members
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">成員</th>
                  <th className="px-5 py-3">權限</th>
                  <th className="px-5 py-3">加入時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.userId} className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                          <div
                            className="h-11 w-11 shrink-0 rounded-full bg-slate-100 bg-cover bg-center ring-1 ring-slate-200"
                            style={{ backgroundImage: `url(${member.avatarUrl})` }}
                            aria-hidden="true"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                            {getInitials(member.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950">{member.name}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${roleBadgeStyles[member.role]}`}>
                        {roleLabels[member.role]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(member.joinedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {members.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-slate-500">
              尚未讀取到團隊成員。請確認已執行 workspace SQL 並完成 owner backfill。
            </div>
          ) : null}
        </div>

        <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">邀請新成員</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                支援公開連結與指定 Email 邀請；Email 會寄出可接受邀請的 7 天效期連結。
              </p>
            </div>
          </div>

          {!canManageTeam ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              你目前是 Recruiter，只有公司 Admin 可以建立邀請票券。
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "link"}
              onClick={() => setActiveTab("link")}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                activeTab === "link"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              連結邀請
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "email"}
              onClick={() => setActiveTab("email")}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                activeTab === "email"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email 邀請
            </button>
          </div>

          {activeTab === "link" ? (
            <div className="mt-5 space-y-4" role="tabpanel">
              <p className="text-sm leading-6 text-slate-500">
                產生 7 天有效的邀請連結，適合貼到 Slack、Line 或內部文件。
              </p>
              <button
                type="button"
                disabled={isPending || !canManageTeam}
                onClick={handleGenerateLink}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
                產生邀請連結
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailInvite} className="mt-5 space-y-4" role="tabpanel">
              <label className="block">
                <span className="text-sm font-medium text-slate-900">受邀者 Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="teammate@company.com"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </label>
              <button
                type="submit"
                disabled={isPending || !canManageTeam}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
                發送 Email 邀請
              </button>
            </form>
          )}

          {generatedLink ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invite URL
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  readOnly
                  value={generatedLink}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white transition hover:bg-slate-800"
                  aria-label="複製邀請連結"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                邀請接受後會自動加入為 Recruiter。
              </p>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
