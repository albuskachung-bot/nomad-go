"use client";

import { FormEvent, useState } from "react";
import { Chrome, Github, Loader2, Mail } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type InviteLoginPanelProps = {
  token: string;
  invitedEmail: string | null;
};

const socialProviders: Array<{
  provider: Provider;
  label: string;
  icon: typeof Github;
}> = [
  { provider: "google", label: "使用 Google 登入", icon: Chrome },
  { provider: "github", label: "使用 GitHub 登入", icon: Github }
];

function buildRedirectTo(token: string) {
  const nextPath = `/invite?token=${encodeURIComponent(token)}`;
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

export default function InviteLoginPanel({ token, invitedEmail }: InviteLoginPanelProps) {
  const [email, setEmail] = useState(invitedEmail ?? "");
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!supabase) {
      setError("尚未設定 Supabase 環境變數，請先設定 .env.local。");
      return;
    }

    setPendingProvider("email");

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildRedirectTo(token)
      }
    });

    setPendingProvider(null);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage("登入連結已送出，請到信箱完成登入後回到此邀請頁。");
  }

  async function handleOAuthLogin(provider: Provider) {
    setError("");
    setMessage("");

    if (!supabase) {
      setError("尚未設定 Supabase 環境變數，請先設定 .env.local。");
      return;
    }

    setPendingProvider(provider);

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildRedirectTo(token)
      }
    });

    if (signInError) {
      setPendingProvider(null);
      setError(signInError.message);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <form onSubmit={handleEmailLogin}>
        <label htmlFor="invite-login-email" className="block text-sm font-medium text-slate-900">
          Email
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-slate-600 focus-within:ring-2 focus-within:ring-slate-100">
          <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            id="invite-login-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>

        <button
          type="submit"
          disabled={pendingProvider !== null}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendingProvider === "email" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Mail className="h-4 w-4" aria-hidden="true" />
          )}
          寄送 Magic Link
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium text-slate-400">或</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="grid gap-3">
        {socialProviders.map((item) => (
          <button
            key={item.provider}
            type="button"
            disabled={pendingProvider !== null}
            onClick={() => handleOAuthLogin(item.provider)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pendingProvider === item.provider ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <item.icon className="h-4 w-4" aria-hidden="true" />
            )}
            {item.label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
