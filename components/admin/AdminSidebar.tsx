"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Map,
  Settings,
  Users
} from "lucide-react";
import type { ProfileRole } from "@/lib/types";

const baseItems = [
  { href: "/admin", label: "總覽儀表板", icon: BarChart3 },
  { href: "/admin/jobs", label: "職缺審核", icon: Briefcase },
  { href: "/admin/talent", label: "人才庫管理", icon: Users },
  { href: "/admin/guides", label: "城市指南管理", icon: Map },
  { href: "/admin/settings", label: "全站設定", icon: Settings }
];

const superAdminItems = [
  { href: "/admin/users", label: "會員管控", icon: Users }
];

export default function AdminSidebar({ role }: { role: ProfileRole | null }) {
  const pathname = usePathname();
  const items = role === "super_admin" ? [...baseItems, ...superAdminItems] : baseItems;

  return (
    <aside className="flex min-h-screen flex-col bg-gray-950 p-4 text-white">
      <div className="px-3 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-300">
          NOMAD-GO
        </div>
        <div className="mt-1 text-xl font-semibold tracking-normal">Admin Console</div>
      </div>

      <nav className="mt-4 grid gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-5 text-gray-300">
        內部營運工具。內容發布與首頁精選會直接影響前台曝光。
      </div>
    </aside>
  );
}
