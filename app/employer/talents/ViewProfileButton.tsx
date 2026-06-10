"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserRound } from "lucide-react";
import { triggerProfileView } from "@/app/employer/talents/actions";

type ViewProfileButtonProps = {
  targetUserId: string;
};

export default function ViewProfileButton({ targetUserId }: ViewProfileButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleViewProfile() {
    setError(null);

    startTransition(async () => {
      const result = await triggerProfileView(targetUserId);

      if (!result.ok) {
        setError(result.error ?? "履歷瀏覽紀錄寫入失敗。");
        return;
      }

      router.push(result.redirectTo ?? `/employer/talents/${targetUserId}`);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleViewProfile}
        disabled={isPending}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <UserRound className="h-4 w-4" aria-hidden="true" />
        )}
        {isPending ? "開啟中..." : "查看完整履歷"}
        <span className="sr-only">View Profile</span>
      </button>

      {error ? <p className="mt-3 text-xs leading-5 text-rose-600">{error}</p> : null}
    </>
  );
}
