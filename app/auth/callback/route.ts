import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = safeNextPath(requestUrl.searchParams.get("next"));
  const redirectUrl = new URL(nextPath, requestUrl.origin);
  let response = NextResponse.redirect(redirectUrl);

  if (!code || !supabaseUrl || !supabaseAnonKey) {
    return response;
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

        response = NextResponse.redirect(redirectUrl);

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorUrl = new URL("/", requestUrl.origin);
    errorUrl.searchParams.set("auth_error", error.message);
    return NextResponse.redirect(errorUrl);
  }

  return response;
}
