import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { adminRoles, type AdminRole } from "@/lib/admin-auth";
import type { Database } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type ProfileGate = {
  is_banned: boolean;
  role: string | null;
};

function redirectWithCookies(request: NextRequest, response: NextResponse, pathname: string) {
  const redirectUrl = new URL(pathname, request.url);
  const redirectResponse = NextResponse.redirect(redirectUrl);

  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}

function isAdminLoginRoute(pathname: string) {
  return pathname === "/admin/login" || pathname.startsWith("/admin/login/");
}

function isAuthCallbackRoute(pathname: string) {
  return pathname === "/auth/callback" || pathname.startsWith("/auth/callback/");
}

function isOnboardingRoute(pathname: string) {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}

function isAccountBannedRoute(pathname: string) {
  return pathname === "/account-banned" || pathname.startsWith("/account-banned/");
}

function isDashboardRoute(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function isProtectedAdminRoute(pathname: string) {
  return pathname.startsWith("/admin") && !isAdminLoginRoute(pathname);
}

function failOpenForProfileRead(
  response: NextResponse,
  error: unknown
) {
  console.error("[middleware] Failed to read latest profile. Fail-open for dashboard/onboarding.", error);

  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  let supabaseResponse = NextResponse.next({
    request
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[middleware] Missing Supabase URL or anon key.");

    if (isProtectedAdminRoute(pathname)) {
      return redirectWithCookies(request, supabaseResponse, "/admin/login");
    }

    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({
          request
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("[middleware] Failed to read auth session.", sessionError);

    if (isProtectedAdminRoute(pathname)) {
      return redirectWithCookies(request, supabaseResponse, "/admin/login");
    }

    if (isDashboardRoute(pathname) || isOnboardingRoute(pathname)) {
      return supabaseResponse;
    }

    return supabaseResponse;
  }

  if (!session?.user) {
    if (isProtectedAdminRoute(pathname)) {
      return redirectWithCookies(request, supabaseResponse, "/admin/login");
    }

    if (isDashboardRoute(pathname)) {
      return redirectWithCookies(request, supabaseResponse, "/");
    }

    return supabaseResponse;
  }

  let profile: ProfileGate | null = null;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("is_banned, role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(`Profile not found for user ${session.user.id}`);
    }

    profile = data;
  } catch (error) {
    if (isProtectedAdminRoute(pathname)) {
      console.error("[middleware] Failed to read admin profile. Fail-closed for admin route.", error);
      return redirectWithCookies(request, supabaseResponse, "/");
    }

    return failOpenForProfileRead(supabaseResponse, error);
  }

  if (profile.is_banned && !isAccountBannedRoute(pathname) && !isAuthCallbackRoute(pathname)) {
    return redirectWithCookies(request, supabaseResponse, "/account-banned");
  }

  if (isProtectedAdminRoute(pathname)) {
    if (adminRoles.includes(profile.role as AdminRole)) {
      return supabaseResponse;
    }

    return redirectWithCookies(request, supabaseResponse, "/");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)"
  ]
};
