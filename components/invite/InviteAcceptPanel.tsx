"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { acceptCompanyInvite } from "@/app/invite/actions";

type InviteAcceptPanelProps = {
  token: string;
};

type Toast = {
  type: "success" | "error";
  message: string;
} | null;

export default function InviteAcceptPanel({ token }: InviteAcceptPanelProps) {
  const router = useRouter();
  const [toast, setToast] = useState<Toast>(null);
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    setToast(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("token", token);
      const result = await acceptCompanyInvite(formData);

      if (!result.ok) {
        setToast({
          type: "error",
          message: result.message
        });
        return;
      }

      setToast({
        type: "success",
        message: result.message
      });
      router.push("/employer/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={isPending}
        onClick={handleAccept}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        )}
        確認加入團隊
      </button>

      {toast ? (
        <div
          className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-rose-50 text-rose-800"
          }`}
          role="status"
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{toast.message}</span>
        </div>
      ) : null}
    </div>
  );
}
