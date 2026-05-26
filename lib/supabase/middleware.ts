import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createSupabaseMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({
    request
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      response,
      supabase: null
    };
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  return {
    response,
    supabase
  };
}
