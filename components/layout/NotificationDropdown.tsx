"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type NotificationDropdownProps = {
  userId: string;
};

const previewItems = [
  {
    id: "profile-views",
    title: "👀 Cloud Harbor 等 3 家企業查看了你的履歷",
    description: "查看最新履歷瀏覽與企業互動紀錄。"
  },
  {
    id: "new-message",
    title: "💬 Remote Ledger 傳送了一則新訊息給您",
    description: "前往訊息中心回覆雇主邀約。"
  }
];

export default function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadUnreadCount() {
      if (!supabase || !userId) {
        return;
      }

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("[notifications] Failed to load unread count.", error);
        setUnreadCount(0);
        return;
      }

      setUnreadCount(count ?? 0);
    }

    void loadUnreadCount();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const hasUnread = unreadCount > 0 || previewItems.length > 0;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
        aria-label={unreadCount > 0 ? `有 ${unreadCount} 則未讀通知` : "通知與訊息"}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {hasUnread && unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-4 text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : hasUnread ? (
          <span
            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-600"
            aria-hidden="true"
          />
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">通知與訊息</p>
          </div>

          <div className="divide-y divide-gray-100">
            {previewItems.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <p className="text-sm font-medium leading-5 text-gray-900">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
            <Link
              href="/dashboard/nomad/applications/messages"
              onClick={() => setIsOpen(false)}
              className="block rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              查看全部通知
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
