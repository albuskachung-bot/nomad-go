"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { updateUserBanStatus, updateUserRole } from "@/app/admin/actions";
import type { ProfileRole } from "@/lib/types";

type UserManagementActionsProps = {
  userId: string;
  role: ProfileRole;
  isBanned: boolean;
};

const roleOptions: Array<{
  value: ProfileRole;
  label: string;
}> = [
  { value: "user", label: "User" },
  { value: "editor", label: "Editor" },
  { value: "super_admin", label: "Super Admin" }
];

function isManageableRole(role: ProfileRole) {
  return roleOptions.some((option) => option.value === role);
}

export default function UserManagementActions({
  userId,
  role,
  isBanned
}: UserManagementActionsProps) {
  const [currentRole, setCurrentRole] = useState<ProfileRole>(role);
  const [banned, setBanned] = useState(isBanned);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [confirmBan, setConfirmBan] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(""), 3000);

    return () => window.clearTimeout(timer);
  }, [toast]);

  function changeRole(nextRole: ProfileRole) {
    const previousRole = currentRole;
    setCurrentRole(nextRole);
    setMessage("");

    startTransition(async () => {
      const formData = new FormData();
      formData.set("user_id", userId);
      formData.set("role", nextRole);

      const result = await updateUserRole(formData);

      if (!result.ok) {
        setCurrentRole(previousRole);
        setMessage(result.message);
        return;
      }

      setToast(result.message || "使用者權限已更新。");
    });
  }

  function toggleBan(nextBanned: boolean) {
    const previousBanned = banned;
    setBanned(nextBanned);
    setMessage("");
    setConfirmBan(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("user_id", userId);
      formData.set("is_banned", String(nextBanned));

      const result = await updateUserBanStatus(formData);

      if (!result.ok) {
        setBanned(previousBanned);
        setMessage(result.message);
        return;
      }

      setToast(result.message || "使用者狀態已更新。");
    });
  }

  return (
    <div className="flex min-w-[260px] items-center justify-end gap-3">
      {toast ? (
        <div className="fixed right-5 top-5 z-[80] inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {toast}
        </div>
      ) : null}

      <label className="sr-only" htmlFor={`role-${userId}`}>
        權限
      </label>
      <select
        id={`role-${userId}`}
        value={currentRole}
        disabled={isPending}
        onChange={(event) => changeRole(event.target.value as ProfileRole)}
        className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
      >
        {!isManageableRole(currentRole) ? (
          <option value={currentRole}>Legacy: {currentRole}</option>
        ) : null}
        {roleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={isPending}
        onClick={() => setConfirmBan(!banned)}
        className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold transition hover:-translate-y-0.5 disabled:opacity-60 ${
          banned
            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
            : "bg-rose-50 text-rose-700 hover:bg-rose-100"
        }`}
      >
        {banned ? "Unban" : "Ban"}
      </button>

      {isPending ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" /> : null}
      {message ? <span className="max-w-32 truncate text-xs text-rose-600">{message}</span> : null}

      {confirmBan !== null ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-950/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 text-left shadow-xl">
            <h2 className="text-base font-semibold text-gray-900">
              {confirmBan ? "確認停權使用者？" : "確認解除停權？"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {confirmBan
                ? "停權後，此使用者將無法存取會員中心與發布相關功能。"
                : "解除停權後，此使用者將恢復會員中心存取權限。"}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmBan(null)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => toggleBan(confirmBan)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                  confirmBan ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {confirmBan ? "確認停權" : "解除停權"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
