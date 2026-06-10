"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type NotificationBellProps = {
  userId: string;
};

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);

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

  return (
    <Link
      href="/dashboard"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
      aria-label={unreadCount > 0 ? `有 ${unreadCount} 則未讀通知` : "通知中心"}
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
      {unreadCount > 0 ? (
        <span className="absolute right-1.5 top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-4 text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
