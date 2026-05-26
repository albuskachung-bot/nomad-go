import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const isBrowser = typeof window !== "undefined";

export const supabase = isSupabaseConfigured
  ? isBrowser
    ? createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!)
    : createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false
        }
      })
  : null;
