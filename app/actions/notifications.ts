"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UnreadNotification = {
  id: string;
  type: string;
  content: string;
  created_at: string;
  link_url: string | null;
};

export type UnreadNotificationsResult = {
  notifications: UnreadNotification[];
  count: number;
  error: string | null;
};

export async function getUnreadNotifications(): Promise<UnreadNotificationsResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      notifications: [],
      count: 0,
      error: "尚未設定 Supabase 環境變數。"
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      notifications: [],
      count: 0,
      error: null
    };
  }

  const { data, count, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, content, link_url, created_at", {
      count: "exact"
    })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return {
      notifications: [],
      count: 0,
      error: error.message
    };
  }

  const notifications = (data ?? []).map((notification) => ({
    id: notification.id,
    type: notification.type,
    content:
      notification.content ||
      notification.message ||
      notification.title ||
      "你有一則新通知",
    created_at: notification.created_at,
    link_url: notification.link_url
  }));

  return {
    notifications,
    count: count ?? notifications.length,
    error: null
  };
}
