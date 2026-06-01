"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldAlert, Trash2, UserPlus, XCircle } from "lucide-react";
import {
  promoteTeamMemberByEmail,
  removeTeamMemberRole,
  setTeamMemberRole
} from "@/app/admin/actions";
import type { AdminRole } from "@/lib/admin-auth";
import type { ProfileRole } from "@/lib/types";

export type TeamMemberRow = {
  id: string;
  email: string;
  name: string;
  role: ProfileRole;
  joinedAt: string;
  avatarUrl: string | null;
  isSelf: boolean;
};

type TeamManagementClientProps = {
  members: TeamMemberRow[];
  serviceRoleWarning: string | null;
  dataError: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
} | null;

const roleOptions: Array<{
  value: AdminRole;
  label: string;
  description: string;
}> = [
  {
    value: "reviewer",
    label: "Reviewer",
    description: "審核職缺與企業資料"
  },
  {
    value: "editor",
    label: "Editor",
    description: "內容與首頁 CMS 編輯"
  },
  {
    value: "super_admin",
    label: "Super Admin",
    description: "完整權限與團隊管理"
  }
];

const roleLabels: Record<ProfileRole, string> = {
  member: "Member",
  reviewer: "Reviewer",
  editor: "Editor",
  super_admin: "Super Admin"
};

const roleBadgeStyles: Record<ProfileRole, string> = {
  member: "bg-slate-100 text-slate-600 ring-slate-200",
  reviewer: "bg-amber-50 text-amber-700 ring-amber-100",
  editor: "bg-blue-50 text-blue-700 ring-blue-100",
  super_admin: "bg-indigo-50 text-indigo-700 ring-indigo-100"
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function getInitials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "A";
}

export default function TeamManagementClient({
  members,
  serviceRoleWarning,
  dataError
}: TeamManagementClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<AdminRole>("reviewer");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3600);

    return () => window.clearTimeout(timer);
  }, [toast]);

  async function changeRole(member: TeamMemberRow, nextRole: AdminRole) {
    if (member.role === nextRole) {
      return;
    }

    setPendingKey(`role:${member.id}`);
    setToast(null);

    const formData = new FormData();
    formData.set("user_id", member.id);
    formData.set("role", nextRole);

    const result = await setTeamMemberRole(formData);

    setPendingKey(null);
    setToast({
      type: result.ok ? "success" : "error",
      message: result.message
    });

    if (result.ok) {
      router.refresh();
    }
  }

  async function removeRole(member: TeamMemberRow) {
    const confirmed = window.confirm(`確定要移除 ${member.email} 的後台權限嗎？`);

    if (!confirmed) {
      return;
    }

    setPendingKey(`remove:${member.id}`);
    setToast(null);

    const formData = new FormData();
    formData.set("user_id", member.id);

    const result = await removeTeamMemberRole(formData);

    setPendingKey(null);
    setToast({
      type: result.ok ? "success" : "error",
      message: result.message
    });

    if (result.ok) {
      router.refresh();
    }
  }

  async function handleAddAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);

    if (!email.trim()) {
      setToast({
        type: "error",
        message: "請輸入有效 Email。"
      });
      return;
    }

    setPendingKey("add");

    const formData = new FormData();
    formData.set("email", email.trim());
    formData.set("role", newRole);

    const result = await promoteTeamMemberByEmail(formData);

    setPendingKey(null);
    setToast({
      type: result.ok ? "success" : "error",
      message: result.message
    });

    if (result.ok) {
      setEmail("");
      setNewRole("reviewer");
      router.refresh();
    }
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

      {serviceRoleWarning || dataError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">權限資料讀取提醒</p>
              {serviceRoleWarning ? <p className="mt-1">{serviceRoleWarning}</p> : null}
              {dataError ? <p className="mt-1">{dataError}</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">管理員列表</h2>
              <p className="mt-1 text-sm text-slate-500">
                直接調整後台角色；移除權限會降級回 member。
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {members.length} admins
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">帳號</th>
                  <th className="px-5 py-3">目前角色</th>
                  <th className="px-5 py-3">加入時間</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => {
                  const isPending =
                    pendingKey === `role:${member.id}` || pendingKey === `remove:${member.id}`;

                  return (
                    <tr key={member.id} className="transition hover:bg-slate-50/80">
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
                            <div className="truncate font-semibold text-slate-950">
                              {member.name}
                              {member.isSelf ? (
                                <span className="ml-2 rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700">
                                  You
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-500">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${roleBadgeStyles[member.role]}`}
                        >
                          {roleLabels[member.role]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{formatDate(member.joinedAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <label className="sr-only" htmlFor={`team-role-${member.id}`}>
                            變更管理員角色
                          </label>
                          <select
                            id={`team-role-${member.id}`}
                            value={member.role}
                            disabled={Boolean(pendingKey)}
                            onChange={(event) =>
                              changeRole(member, event.target.value as AdminRole)
                            }
                            className="h-10 min-w-36 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {roleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={Boolean(pendingKey) || member.isSelf}
                            onClick={() => removeRole(member)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                            title={
                              member.isSelf
                                ? "不能移除自己的 Super Admin 權限"
                                : "移除後台權限"
                            }
                          >
                            {isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            )}
                            移除權限
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {members.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm font-semibold text-slate-700">尚未讀取到後台管理員。</p>
              <p className="mt-2 text-sm text-slate-500">
                請確認目前帳號已設為 super_admin，且 Supabase SQL migration 已執行。
              </p>
            </div>
          ) : null}
        </div>

        <form
          onSubmit={handleAddAdmin}
          className="h-fit rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-950">新增管理員</h2>
              <p className="text-sm text-slate-500">輸入 Email；未註冊者會收到邀請信。</p>
            </div>
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-medium text-slate-900">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@example.com"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-900">指派角色</span>
            <select
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as AdminRole)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={Boolean(pendingKey)}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingKey === "add" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            )}
            {pendingKey === "add" ? "新增中..." : "新增管理員"}
          </button>
        </form>
      </section>
    </div>
  );
}
