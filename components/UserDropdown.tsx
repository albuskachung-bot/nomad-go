"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Bookmark,
  BriefcaseBusiness,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Send,
  Settings,
  Shield,
  User,
  type LucideIcon
} from "lucide-react";
import { isAdminRole } from "@/lib/admin-auth";
import type { ProfileRole } from "@/lib/types";

type UserDropdownProps = {
  user: SupabaseUser;
  profileRole: ProfileRole | null;
  onSignOut: () => Promise<void> | void;
};

type MenuItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const memberItems: MenuItem[] = [
  {
    href: "/dashboard/nomad",
    label: "會員中心",
    description: "Member Dashboard",
    icon: LayoutDashboard
  },
  {
    href: "/dashboard/nomad/resume",
    label: "編輯履歷",
    description: "Resume",
    icon: User
  },
  {
    href: "/dashboard/nomad/saved",
    label: "我的收藏",
    description: "Saved Jobs",
    icon: Bookmark
  },
  {
    href: "/dashboard/nomad/applications",
    label: "應徵紀錄",
    description: "Applications",
    icon: Send
  },
  {
    href: "/dashboard/nomad/billing",
    label: "方案與帳單",
    description: "Billing",
    icon: CreditCard
  },
  {
    href: "/dashboard/nomad/settings",
    label: "帳號設定",
    description: "Settings",
    icon: Settings
  }
];

export default function UserDropdown({
  user,
  profileRole,
  onSignOut
}: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = useMemo(() => {
    return (
      user.user_metadata.full_name ??
      user.user_metadata.name ??
      user.email ??
      "會員"
    );
  }, [user.email, user.user_metadata.full_name, user.user_metadata.name]);

  const avatarUrl = user.user_metadata.avatar_url as string | undefined;
  const initials = displayName.trim().slice(0, 1).toUpperCase();
  const showAdminEntry = isAdminRole(profileRole);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
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

  async function handleSignOut() {
    setIsOpen(false);
    await onSignOut();
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-11 max-w-[13rem] items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:text-gray-900 hover:shadow-md"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span
          className="h-8 w-8 shrink-0 rounded-full bg-blue-600 bg-cover bg-center text-sm font-semibold leading-8 text-white"
          style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
          aria-hidden="true"
        >
          {!avatarUrl ? initials : null}
        </span>
        <span className="hidden min-w-0 truncate text-left sm:block">{displayName}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      <div
        role="menu"
        aria-hidden={!isOpen}
        className={`absolute right-0 mt-3 w-72 origin-top-right rounded-xl border border-gray-100 bg-white p-2 shadow-lg ring-1 ring-gray-900/5 transition duration-150 ease-out ${
          isOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
      >
        <div className="px-3 py-3">
          <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
          <p className="truncate text-xs text-gray-500">{user.email}</p>
        </div>

        <MenuSection items={memberItems} onSelect={() => setIsOpen(false)} />

        <div className="my-2 border-t border-gray-100" />

        <DropdownLink
          href="/dashboard/employer"
          icon={BriefcaseBusiness}
          label="企業雇主中心 (Employer Console)"
          description="招募與公司職缺管理"
          onSelect={() => setIsOpen(false)}
        />

        {showAdminEntry ? (
          <>
            <div className="my-2 border-t border-gray-100" />
            <DropdownLink
              href="/admin"
              icon={Shield}
              label="管理後台"
              description="Admin Console"
              onSelect={() => setIsOpen(false)}
            />
          </>
        ) : null}

        <div className="my-2 border-t border-gray-100" />

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-gray-50"
          role="menuitem"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-gray-900">登出</span>
            <span className="block text-xs text-gray-500">Sign Out</span>
          </span>
        </button>
      </div>
    </div>
  );
}

function MenuSection({ items, onSelect }: { items: MenuItem[]; onSelect: () => void }) {
  return (
    <div className="py-1">
      {items.map((item) => (
        <DropdownLink key={item.href} {...item} onSelect={onSelect} />
      ))}
    </div>
  );
}

function DropdownLink({
  href,
  icon: Icon,
  label,
  description,
  onSelect
}: MenuItem & { onSelect: () => void }) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-gray-50"
      role="menuitem"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium leading-5 text-gray-900">{label}</span>
        <span className="block truncate text-xs text-gray-500">{description}</span>
      </span>
    </Link>
  );
}
