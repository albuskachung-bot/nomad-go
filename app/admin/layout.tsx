"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Building2,
  CreditCard,
  Crown,
  Home,
  LayoutDashboard,
  PenLine,
  Settings,
  UserCog,
  Users
} from "lucide-react";

const navItems = [
  {
    href: "/admin",
    label: "營運總覽",
    helper: "Overview",
    icon: LayoutDashboard
  },
  {
    href: "/admin/employers",
    label: "企業入駐清單",
    helper: "Employers",
    icon: Building2
  },
  {
    href: "/admin/jobs",
    label: "職缺資料庫",
    helper: "Jobs Inventory / AI Review",
    icon: Briefcase
  },
  {
    href: "/admin/posts/create",
    label: "官方專欄",
    helper: "Column Editor",
    icon: PenLine
  },
  {
    href: "/admin/virtual-authors",
    label: "虛擬作者",
    helper: "Author Profiles",
    icon: Users
  },
  {
    href: "/admin/billing",
    label: "財務與訂閱",
    helper: "Billing & Finance",
    icon: CreditCard
  },
  {
    href: "/admin/companies",
    label: "企業方案控制台",
    helper: "Company Plan Overrides",
    icon: Crown
  },
  {
    href: "/admin/talents",
    label: "人才方案控制台",
    helper: "Talent Plan Overrides",
    icon: Users
  },
  {
    href: "/admin/team",
    label: "權限與團隊",
    helper: "Team & Roles",
    icon: UserCog
  },
  {
    href: "/admin/settings",
    label: "系統設定",
    helper: "Settings",
    icon: Settings
  }
];

function isItemActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

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
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-800 bg-slate-950 px-5 py-6 text-white lg:flex">
        <div className="px-2">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            NOMAD-GO
          </div>
          <div className="mt-2 text-xl font-semibold tracking-normal">
            Admin Console
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            SaaS 營運與財務控制中心
          </p>
        </div>

        <nav className="mt-8 grid gap-2" aria-label="營運後台導覽">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                  isActive
                    ? "bg-cyan-500/15 text-white ring-1 ring-cyan-400/20"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${isActive ? "text-cyan-300" : ""}`}
                  aria-hidden="true"
                />
                <span>
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">
                    {item.helper}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-3 text-slate-100 transition hover:bg-cyan-400/20 hover:text-white"
          >
            <Home className="h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
            <span>
              <span className="block text-sm font-medium">前往前台</span>
              <span className="mt-0.5 block text-[11px] text-slate-400">
                View Site
              </span>
            </span>
          </Link>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold text-cyan-300">Module readiness</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              AI 審核與金流 API 已保留介面位置，待服務憑證與工作流串接。
            </p>
          </div>
        </div>
      </aside>

      <header className="border-b border-slate-200 bg-white px-4 py-4 lg:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
            NOMAD-GO
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">Admin Console</p>
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="營運後台導覽">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-800 transition hover:bg-cyan-100"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            前往前台
          </Link>
        </nav>
      </header>

      <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:pl-80 lg:pr-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
