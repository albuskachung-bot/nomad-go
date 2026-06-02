"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Compass, LogIn } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import LoginModal from "@/components/LoginModal";
import UserDropdown from "@/components/UserDropdown";
import { supabase } from "@/lib/supabase/client";
import type { ProfileRole } from "@/lib/types";

const navItems = [
  { href: "/", label: "首頁" },
  { href: "/jobs", label: "遠端職缺" },
  { href: "/companies", label: "企業" },
  { href: "/talent", label: "人才自薦" },
  { href: "/blog", label: "遊牧專欄" },
  { href: "/pricing", label: "方案" },
  { href: "/toolkit", label: "實用工具" }
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profileRole, setProfileRole] = useState<ProfileRole | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      setProfileRole(null);
      return;
    }

    const supabaseClient = supabase;

    async function syncProfileRole(userId: string) {
      const { data } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      setProfileRole((data?.role as ProfileRole | undefined) ?? null);
    }

    supabaseClient.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        void syncProfileRole(data.user.id);
      } else {
        setProfileRole(null);
      }
      setIsAuthLoading(false);
    });

    const {
      data: { subscription }
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      const nextUser = nextSession?.user ?? null;

      setUser(nextUser);
      if (nextUser) {
        void syncProfileRole(nextUser.id);
      } else {
        setProfileRole(null);
      }
      setIsAuthLoading(false);
      if (nextSession) {
        setIsLoginOpen(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    if (!supabase) {
      setUser(null);
      setProfileRole(null);
      router.push("/");
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setProfileRole(null);
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2" aria-label="NOMAD-GO 首頁">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-normal text-gray-900 sm:text-lg">
              NOMAD-GO
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-1 rounded-full bg-gray-50 p-1 md:flex">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition-colors lg:px-4 ${
                      isActive
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {user ? (
              <UserDropdown
                user={user}
                profileRole={profileRole}
                onSignOut={handleSignOut}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg sm:px-4"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span>{isAuthLoading ? "確認中" : "登入/註冊"}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <LoginModal open={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}
