import Link from "next/link";
import { Building2, Eye, Lock } from "lucide-react";
import { getProfileViews } from "@/app/actions/profileViews";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileView } from "@/lib/types";

function formatViewedAt(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei"
  }).format(new Date(value));
}

function ViewRow({ view }: { view: ProfileView }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <Building2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-950">
            {view.viewer_company_name}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatViewedAt(view.viewed_at)} 查看了你的履歷
          </p>
        </div>
      </div>
    </article>
  );
}

function LockedViewRow({ index }: { index: number }) {
  return (
    <article className="pointer-events-none select-none rounded-lg border border-slate-200 bg-white p-4 shadow-sm blur-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
          <Building2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="h-4 w-40 rounded bg-slate-300" />
          <p className="mt-2 h-3 w-28 rounded bg-slate-200" />
        </div>
      </div>
      <span className="sr-only">已鎖定的瀏覽紀錄 {index + 1}</span>
    </article>
  );
}

export default async function ProfileViewsCard() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">誰看過我的履歷</h2>
        <p className="mt-2 text-sm text-slate-500">請先登入後查看履歷瀏覽紀錄。</p>
      </section>
    );
  }

  const { totalCount, views, isLocked, error } = await getProfileViews(user.id);
  const lockedCount = isLocked && totalCount > 1 ? totalCount - 1 : 0;

  return (
    <section className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-blue-700">Profile Views</p>
          <h2 className="mt-2 text-xl font-semibold tracking-normal text-slate-950">
            本週有 {totalCount} 家企業看過你的履歷
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            升級後可查看完整企業名單，掌握正在關注你的招募機會。
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <Eye className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {error ? (
        <p className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 space-y-3">
        {views.map((view) => (
          <ViewRow key={view.id} view={view} />
        ))}

        {views.length === 0 && !error ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            目前尚無企業瀏覽紀錄。
          </p>
        ) : null}

        {lockedCount > 0 ? (
          <div className="relative">
            <div className="space-y-3">
              {Array.from({ length: lockedCount }).map((_, index) => (
                <LockedViewRow key={index} index={index} />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/45 px-4">
              <div className="rounded-xl bg-white/95 p-4 text-center shadow-lg ring-1 ring-blue-100">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <Lock className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-950">
                  還有 {lockedCount} 筆瀏覽紀錄待解鎖
                </p>
                <Link
                  href="/dashboard/nomad/billing"
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  升級 Pro 解鎖全部瀏覽紀錄
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
