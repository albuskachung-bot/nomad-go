"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, Loader2, Shield, UserRound, XCircle } from "lucide-react";
import { updateUserBanStatus, updateUserRole } from "@/app/admin/actions";
import { supabase } from "@/lib/supabase/client";
import type { Profile, ProfileRole } from "@/lib/types";

type ManagedRole = ProfileRole;

type Toast = {
  type: "success" | "error";
  message: string;
};

const roleOptions: Array<{
  value: ManagedRole;
  label: string;
}> = [
  { value: "super_admin", label: "Super Admin" },
  { value: "editor", label: "Editor" },
  { value: "reviewer", label: "Reviewer" },
  { value: "member", label: "Member" }
];

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  editor: "Editor",
  reviewer: "Reviewer",
  member: "Member",
  talent: "Talent",
  employer: "Employer",
  admin: "Legacy Admin",
  moderator: "Moderator"
};

const roleBadgeStyles: Record<string, string> = {
  super_admin: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  editor: "bg-blue-50 text-blue-700 ring-blue-100",
  reviewer: "bg-amber-50 text-amber-700 ring-amber-100",
  member: "bg-gray-100 text-gray-700 ring-gray-200",
  talent: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  employer: "bg-amber-50 text-amber-700 ring-amber-100",
  admin: "bg-purple-50 text-purple-700 ring-purple-100",
  moderator: "bg-sky-50 text-sky-700 ring-sky-100"
};

const manageableRoles = roleOptions.map((option) => option.value);

function isManagedRole(role: ProfileRole): role is ManagedRole {
  return manageableRoles.includes(role as ManagedRole);
}

function getInitials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "U";
}

function getDisplayName(profile: Profile) {
  return profile.full_name?.trim() || profile.title?.trim() || "未命名使用者";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "發生未知錯誤，請稍後再試。";
}

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentRole, setCurrentRole] = useState<ProfileRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const hasProfiles = profiles.length > 0;
  const canManageUsers = currentRole === "super_admin";

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [profiles]);

  const showToast = useCallback((nextToast: Toast) => {
    setToast(nextToast);
  }, []);

  const fetchProfiles = useCallback(async () => {
    if (!supabase) {
      setProfiles([]);
      setIsLoading(false);
      showToast({
        type: "error",
        message: "尚未設定 Supabase 環境變數，無法讀取會員資料。"
      });
      return;
    }

    try {
      setIsLoading(true);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const nextProfiles = (data ?? []) as Profile[];
      setProfiles(nextProfiles);
      setCurrentRole(nextProfiles.find((profile) => profile.id === user?.id)?.role ?? null);
    } catch (error) {
      showToast({
        type: "error",
        message: `會員資料讀取失敗：${getErrorMessage(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);

    return () => window.clearTimeout(timer);
  }, [toast]);

  async function updateRole(userId: string, role: ManagedRole) {
    if (!canManageUsers) {
      showToast({
        type: "error",
        message: "只有 Super Admin 可以更新權限。"
      });
      return;
    }

    if (!supabase) {
      showToast({
        type: "error",
        message: "尚未設定 Supabase 環境變數，無法更新權限。"
      });
      return;
    }

    try {
      setPendingUserId(userId);

      const formData = new FormData();
      formData.set("user_id", userId);
      formData.set("role", role);
      const result = await updateUserRole(formData);

      if (!result.ok) {
        throw new Error(result.message);
      }

      showToast({
        type: "success",
        message: "使用者權限已更新。"
      });
      await fetchProfiles();
    } catch (error) {
      showToast({
        type: "error",
        message: `權限更新失敗：${getErrorMessage(error)}`
      });
    } finally {
      setPendingUserId(null);
    }
  }

  async function toggleBan(profile: Profile) {
    if (!canManageUsers) {
      showToast({
        type: "error",
        message: "只有 Super Admin 可以變更停權狀態。"
      });
      return;
    }

    const confirmed = window.confirm("確定要變更此使用者的停權狀態嗎？");

    if (!confirmed) {
      return;
    }

    try {
      setPendingUserId(profile.id);

      const formData = new FormData();
      formData.set("user_id", profile.id);
      formData.set("is_banned", String(!profile.is_banned));
      const result = await updateUserBanStatus(formData);

      if (!result.ok) {
        throw new Error(result.message);
      }

      showToast({
        type: "success",
        message: profile.is_banned ? "使用者已解除停權。" : "使用者已停權。"
      });
      await fetchProfiles();
    } catch (error) {
      showToast({
        type: "error",
        message: `停權狀態更新失敗：${getErrorMessage(error)}`
      });
    } finally {
      setPendingUserId(null);
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

      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            User Management
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-gray-900">
            會員與權限管理
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            管理會員白名單角色與黑名單停權狀態。Role 變更會立即寫入 Supabase profiles。
          </p>
        </div>

        <button
          type="button"
          onClick={fetchProfiles}
          disabled={isLoading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Shield className="h-4 w-4" aria-hidden="true" />
          )}
          重新整理
        </button>
      </section>

      {!canManageUsers && !isLoading ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          目前為唯讀模式，只有 Super Admin 可以更新白名單角色與黑名單停權狀態。
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-4">使用者名稱 / Avatar</th>
                <th className="px-6 py-4">目前身分</th>
                <th className="px-6 py-4">帳號狀態</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <LoadingRows />
              ) : (
                sortedProfiles.map((profile) => {
                  const displayName = getDisplayName(profile);
                  const isPending = pendingUserId === profile.id;
                  const roleValue = isManagedRole(profile.role) ? profile.role : "member";

                  return (
                    <tr key={profile.id} className="transition hover:bg-gray-50/80">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          {profile.avatar_url ? (
                            <div
                              className="h-11 w-11 shrink-0 rounded-full bg-gray-100 bg-cover bg-center ring-1 ring-gray-200"
                              style={{ backgroundImage: `url(${profile.avatar_url})` }}
                              aria-hidden="true"
                            />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                              {getInitials(displayName)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="truncate font-semibold text-gray-900">
                              {displayName}
                            </div>
                            <div className="mt-1 truncate text-xs text-gray-500">
                              {profile.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                            roleBadgeStyles[profile.role] ?? "bg-gray-100 text-gray-700 ring-gray-200"
                          }`}
                        >
                          {roleLabels[profile.role] ?? profile.role}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                            profile.is_banned
                              ? "bg-rose-50 text-rose-700 ring-rose-100"
                              : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          }`}
                        >
                          {profile.is_banned ? "已停權" : "正常"}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-3">
                          <label className="sr-only" htmlFor={`role-${profile.id}`}>
                            修改使用者權限
                          </label>
                          <select
                            id={`role-${profile.id}`}
                            value={roleValue}
                            disabled={isPending || !canManageUsers}
                            onChange={(event) =>
                              updateRole(profile.id, event.target.value as ManagedRole)
                            }
                            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {roleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={isPending || !canManageUsers}
                            onClick={() => toggleBan(profile)}
                            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              profile.is_banned
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                            }`}
                          >
                            {isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Ban className="h-4 w-4" aria-hidden="true" />
                            )}
                            {profile.is_banned ? "解除停權" : "停權"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && !hasProfiles ? (
          <div className="px-6 py-14 text-center">
            <UserRound className="mx-auto h-10 w-10 text-gray-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-gray-600">
              目前沒有可管理的會員資料。
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((item) => (
        <tr key={item} className="animate-pulse">
          <td className="px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-gray-200" />
              <div className="space-y-2">
                <div className="h-4 w-36 rounded bg-gray-200" />
                <div className="h-3 w-56 rounded bg-gray-100" />
              </div>
            </div>
          </td>
          <td className="px-6 py-5">
            <div className="h-6 w-24 rounded-full bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="h-6 w-20 rounded-full bg-gray-100" />
          </td>
          <td className="px-6 py-5">
            <div className="ml-auto h-10 w-64 rounded-lg bg-gray-100" />
          </td>
        </tr>
      ))}
    </>
  );
}
