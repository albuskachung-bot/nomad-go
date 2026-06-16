"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import {
  getUnreadNotifications,
  markNotificationAsRead,
  type UnreadNotification
} from "@/app/actions/notifications";

function formatNotificationTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getNotificationHref(notification: UnreadNotification) {
  return notification.action_url || notification.link_url;
}

function renderNotificationContent(notification: UnreadNotification) {
  if (notification.type === "profile_view" && notification.content.includes(" 查看了")) {
    const [companyName, ...rest] = notification.content.split(" 查看了");

    return (
      <>
        <span className="font-semibold text-blue-600">{companyName}</span>
        {` 查看了${rest.join(" 查看了")}`}
      </>
    );
  }

  return notification.content;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<UnreadNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      try {
        const result = await getUnreadNotifications();

        if (isMounted) {
          if (result.error) {
            console.error("[notifications] Failed to load unread notifications.", result.error);
          }

          setNotifications(result.notifications);
          setUnreadCount(result.count);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          console.error("[notifications] Failed to load unread notifications.", error);
          setNotifications([]);
          setUnreadCount(0);
          setIsLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

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

  function handleNotificationClick(notificationId: string) {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId)
    );
    setUnreadCount((current) => Math.max(0, current - 1));
    setIsOpen(false);

    void markNotificationAsRead(notificationId).then((result) => {
      if (!result.ok && result.error) {
        console.error("[notifications] Failed to mark notification as read.", result.error);
      }
    });
  }

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
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-4 text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">通知與訊息</p>
          </div>

          <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-6 text-sm text-gray-500">載入通知中...</div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => {
                const href = getNotificationHref(notification);
                const itemContent = (
                  <>
                    <p className="text-sm font-medium leading-5 text-gray-900">
                      {renderNotificationContent(notification)}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {formatNotificationTime(notification.created_at)}
                    </p>
                  </>
                );

                return href ? (
                  <Link
                    key={notification.id}
                    href={href}
                    onClick={() => handleNotificationClick(notification.id)}
                    className="block px-4 py-3 transition hover:bg-blue-50"
                  >
                    {itemContent}
                  </Link>
                ) : (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification.id)}
                    className="block w-full px-4 py-3 text-left transition hover:bg-gray-50"
                  >
                    {itemContent}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-6 text-sm text-gray-500">
                目前沒有新通知
              </div>
            )}
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
