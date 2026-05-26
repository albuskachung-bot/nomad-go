"use client";

import { useState } from "react";
import { Chrome, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function AdminGoogleLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleLogin() {
    setError("");

    if (!supabase) {
      setError("尚未設定 Supabase 環境變數，無法進入管理後台。");
      return;
    }

    setIsLoading(true);
    const redirectTo = `${location.origin}/auth/callback?next=/admin`;

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo
      }
    });

    if (signInError) {
      setIsLoading(false);
      setError(signInError.message);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Chrome className="h-4 w-4" aria-hidden="true" />
        )}
        使用 Google 登入後台
      </button>

      {error ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
