"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  LayoutDashboard,
  Map,
  Settings,
  Shield,
  Sparkles,
  Users
} from "lucide-react";

const navItems = [
  {
    href: "/admin",
    label: "總覽儀表板",
    icon: LayoutDashboard
  },
  {
    href: "/admin/jobs",
    label: "職缺審核",
    icon: Briefcase
  },
  {
    href: "/admin/users",
    label: "會員與權限",
    icon: Users
  },
  {
    href: "/admin/talent",
    label: "人才庫管理",
    icon: Users
  },
  {
    href: "/admin/guides",
    label: "城市指南管理",
    icon: Map
  },
  {
    href: "/admin/curation",
    label: "精選曝光",
    icon: Sparkles
  },
  {
    href: "/admin/user-roles",
    label: "角色白名單",
    icon: Shield
  },
  {
    href: "/admin/settings",
    label: "全站設定 (CMS)",
    icon: Settings
  }
];

export default function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage =
    pathname === "/admin/login" || pathname.startsWith("/admin/login/");

  if (isLoginPage) {
    return children;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-800 bg-slate-900 px-5 py-6 text-white lg:flex">
        <div className="px-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            NOMAD-GO
          </div>
          <div className="mt-2 text-xl font-semibold tracking-normal">
            Admin Console
          </div>
        </div>

        <nav className="mt-8 grid gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-slate-300">
          管理內容審核、會員權限與站台設定。
        </div>
      </aside>

      <main className="min-h-screen bg-gray-50 p-6 lg:pl-80 lg:pr-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
