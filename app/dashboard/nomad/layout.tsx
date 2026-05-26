"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Bookmark,
  Briefcase,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Mail,
  Settings,
  UserRound,
  type LucideIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type DashboardUser = {
  email: string;
  initial: string;
  name: string;
};

type NavItem = {
  href: string;
  label: string;
  helper: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard/nomad",
    label: "會員中心",
    helper: "Member Dashboard",
    icon: LayoutDashboard
  },
  {
    href: "/dashboard/nomad/resume",
    label: "編輯履歷",
    helper: "Resume",
    icon: UserRound
  },
  {
    href: "/dashboard/nomad/saved",
    label: "我的收藏",
    helper: "Saved Jobs",
    icon: Bookmark
  },
  {
    href: "/dashboard/nomad/applications",
    label: "應徵紀錄",
    helper: "Applications",
    icon: Briefcase
  },
  {
    href: "/dashboard/nomad/billing",
    label: "方案與帳單",
    helper: "Billing",
    icon: CreditCard
  },
  {
    href: "/dashboard/nomad/settings",
    label: "帳號設定",
    helper: "Settings",
    icon: Settings
  }
];

function getDashboardUser(user: SupabaseUser | null): DashboardUser {
  const email = user?.email ?? "尚未登入";
  const metadataName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user?.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";
  const name = metadataName || email.split("@")[0] || "會員";
  const initial = name.trim().charAt(0).toUpperCase() || "M";

  return { email, initial, name };
}

export default function MemberDashboardLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const [dashboardUser, setDashboardUser] = useState<DashboardUser>({
    email: "載入中",
    initial: "M",
    name: "會員"
  });
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let ignore = false;

    if (!supabase) {
      setDashboardUser({
        email: "尚未設定 Supabase",
        initial: "M",
        name: "會員"
      });
      return;
    }

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!ignore) {
          setDashboardUser(getDashboardUser(data.user));
        }
      })
      .catch(() => {
        if (!ignore) {
          setDashboardUser(getDashboardUser(null));
        }
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setDashboardUser(getDashboardUser(session?.user ?? null));
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <div className="min-h-screen bg-sky-50 text-slate-900">
      <header className="border-b border-emerald-100 bg-white px-4 py-4 lg:hidden">
        <Link href="/" className="text-lg font-semibold tracking-normal text-slate-950">
          NOMAD-GO
        </Link>
        <p className="mt-1 text-sm text-slate-500">會員中心</p>

        <nav aria-label="會員中心導覽" className="mt-4 flex gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard/nomad"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-max items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-emerald-100 bg-white px-5 py-6 lg:flex">
        <div className="px-2">
          <Link href="/" className="text-xl font-semibold tracking-normal text-slate-950">
            NOMAD-GO
          </Link>
          <p className="mt-2 text-sm text-emerald-700">Member Dashboard</p>
        </div>

        <nav className="mt-8 grid gap-2" aria-label="會員中心導覽">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard/nomad"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100"
                    : "text-slate-600 hover:bg-sky-50 hover:text-slate-950"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="block">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {item.helper}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-xs leading-5 text-emerald-900">
          集中管理履歷、收藏、應徵紀錄、方案與帳號設定。雇主也能在這裡維護自己的個人會員資料。
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-emerald-100 bg-sky-50/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">會員中心</p>
              <h1 className="mt-1 text-xl font-semibold tracking-normal text-slate-950">
                個人後台
              </h1>
            </div>

            <div className="flex items-center gap-3 sm:justify-end">
              <div className="flex min-w-0 items-center gap-3 rounded-lg border border-emerald-100 bg-white px-3 py-2 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white">
                  {dashboardUser.initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {dashboardUser.name}
                  </p>
                  <p className="flex min-w-0 items-center gap-1 truncate text-xs text-slate-500">
                    <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{dashboardUser.email}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {isSigningOut ? "登出中..." : "登出"}
              </button>
            </div>
          </div>
        </header>

        <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
