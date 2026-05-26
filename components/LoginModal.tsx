"use client";

import { FormEvent, useState } from "react";
import { Chrome, Github, Loader2, Mail, X } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

const socialProviders: Array<{
  provider: Provider;
  label: string;
  icon: typeof Github;
}> = [
  { provider: "google", label: "使用 Google 登入", icon: Chrome },
  { provider: "github", label: "使用 GitHub 登入", icon: Github }
];

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!open) {
    return null;
  }

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!supabase) {
      setError("尚未設定 Supabase 環境變數，請先設定 .env.local。");
      return;
    }

    setPendingProvider("email");
    const redirectTo = `${location.origin}/auth/callback?next=/onboarding`;

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo
      }
    });

    setPendingProvider(null);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage("登入連結已送出，請到信箱完成登入。");
  }

  async function handleOAuthLogin(provider: Provider) {
    setError("");
    setMessage("");

    if (!supabase) {
      setError("尚未設定 Supabase 環境變數，請先設定 .env.local。");
      return;
    }

    setPendingProvider(provider);
    const redirectTo = `${location.origin}/auth/callback?next=/onboarding`;

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo
      }
    });

    if (signInError) {
      setPendingProvider(null);
      setError(signInError.message);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/35 backdrop-blur-sm"
        aria-label="關閉登入視窗"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-2xl ring-1 ring-gray-200"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Passwordless
            </p>
            <h2 id="login-modal-title" className="mt-1 text-2xl font-semibold text-gray-900">
              登入 / 註冊
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              用 Magic Link 或社群帳號快速開始，詳細 Profile 可之後再補齊。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-900"
            aria-label="關閉"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleEmailLogin} className="mt-6">
          <label htmlFor="login-email" className="block text-sm font-medium text-gray-900">
            Email
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
            <Mail className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={pendingProvider !== null}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pendingProvider === "email" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="h-4 w-4" aria-hidden="true" />
            )}
            寄送 Magic Link
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-medium text-gray-400">或</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="grid gap-3">
          {socialProviders.map((item) => (
            <button
              key={item.provider}
              type="button"
              disabled={pendingProvider !== null}
              onClick={() => handleOAuthLogin(item.provider)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
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
          <p className="mt-5 rounded-lg bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-700">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
