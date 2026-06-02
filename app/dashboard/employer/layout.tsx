"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquareText,
  UserCog,
  Users,
  XCircle,
  type LucideIcon
} from "lucide-react";
import { getEmployerWorkspaceContext } from "@/lib/employer-workspace";
import { supabase } from "@/lib/supabase/client";
import type { CompanyApprovalStatus } from "@/lib/types";

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
    href: "/dashboard/employer",
    label: "招募總覽",
    helper: "Dashboard",
    icon: LayoutDashboard
  },
  {
    href: "/dashboard/employer/jobs",
    label: "職缺管理",
    helper: "Jobs",
    icon: BriefcaseBusiness
  },
  {
    href: "/dashboard/employer/company",
    label: "公司品牌設定",
    helper: "Company Profile",
    icon: Building2
  },
  {
    href: "/dashboard/employer/applicants",
    label: "應徵者管理",
    helper: "Applicants",
    icon: Users
  },
  {
    href: "/dashboard/employer/messages",
    label: "訊息中心",
    helper: "Inbox",
    icon: MessageSquareText
  },
  {
    href: "/dashboard/employer/billing",
    label: "方案與帳單",
    helper: "Billing",
    icon: CreditCard
  },
  {
    href: "/dashboard/employer/team",
    label: "團隊管理",
    helper: "Team",
    icon: UserCog
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
  const name = metadataName || email.split("@")[0] || "企業會員";
  const initial = name.trim().charAt(0).toUpperCase() || "N";

  return { email, initial, name };
}

export default function EmployerDashboardLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const [dashboardUser, setDashboardUser] = useState<DashboardUser>({
    email: "正在確認會員",
    initial: "N",
    name: "企業會員"
  });
  const [approvalStatus, setApprovalStatus] = useState<CompanyApprovalStatus | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let ignore = false;

    if (!supabase) {
      setDashboardUser({
        email: "尚未連線 Supabase",
        initial: "N",
        name: "企業會員"
      });
      setApprovalStatus(null);
      return;
    }

    const supabaseClient = supabase;

    async function loadUserAndWorkspace() {
      try {
        const { data } = await supabaseClient.auth.getUser();

        if (ignore) {
          return;
        }

        setDashboardUser(getDashboardUser(data.user));

        if (!data.user) {
          setApprovalStatus(null);
          return;
        }

        const workspace = await getEmployerWorkspaceContext(supabaseClient, data.user.id);

        if (!ignore) {
          setApprovalStatus(workspace.context?.company.approval_status ?? null);
        }
      } catch {
        if (!ignore) {
          setDashboardUser(getDashboardUser(null));
          setApprovalStatus(null);
        }
      }
    }

    function handleWorkspaceUpdated() {
      void loadUserAndWorkspace();
    }

    loadUserAndWorkspace();
    window.addEventListener("employer-workspace-updated", handleWorkspaceUpdated);

    const {
      data: { subscription }
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setDashboardUser(getDashboardUser(session?.user ?? null));

      if (!session?.user) {
        setApprovalStatus(null);
        return;
      }

      getEmployerWorkspaceContext(supabaseClient, session.user.id)
        .then((workspace) => {
          if (!ignore) {
            setApprovalStatus(workspace.context?.company.approval_status ?? null);
          }
        })
        .catch(() => {
          if (!ignore) {
            setApprovalStatus(null);
          }
        });
    });

    return () => {
      ignore = true;
      window.removeEventListener("employer-workspace-updated", handleWorkspaceUpdated);
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
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-800 bg-slate-950 px-4 py-4 text-white lg:hidden">
        <Link href="/" className="text-lg font-semibold tracking-normal">
          NOMAD-GO
        </Link>
        <p className="mt-1 text-sm text-slate-400">企業雇主招募中心</p>

        <nav
          aria-label="企業雇主中心導覽"
          className="mt-4 flex gap-2 overflow-x-auto"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard/employer"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-max items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-800 bg-slate-950 px-5 py-6 text-white lg:flex">
        <div className="px-2">
          <Link href="/" className="text-xl font-semibold tracking-normal">
            NOMAD-GO
          </Link>
          <p className="mt-2 text-sm text-slate-400">Employer Console</p>
        </div>

        <nav className="mt-8 grid gap-2" aria-label="企業雇主中心導覽">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard/employer"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="block">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {item.helper}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-lg border border-white/10 bg-white/5 p-4 text-xs leading-5 text-slate-300">
          管理職缺、公司品牌與應徵者名單，讓招募流程集中而清楚。
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-100/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">企業雇主中心</p>
              <h1 className="mt-1 text-xl font-semibold tracking-normal text-slate-950">
                招募工作台
              </h1>
            </div>

            <div className="flex items-center gap-3 sm:justify-end">
              <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white">
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
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {isSigningOut ? "登出中" : "登出"}
              </button>
            </div>
          </div>
        </header>

        <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
          {approvalStatus === "pending" ? (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900 shadow-sm">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>⚠️ 您的企業入駐申請正在審核中。預計 1-2 個工作天內完成，核准後即可發布職缺。</p>
            </div>
          ) : null}

          {approvalStatus === "rejected" ? (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-800 shadow-sm">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>❌ 您的入駐申請暫未通過審核，請確認資料正確性或聯繫平台客服。</p>
            </div>
          ) : null}

          {children}
        </main>
      </div>
    </div>
  );
}
