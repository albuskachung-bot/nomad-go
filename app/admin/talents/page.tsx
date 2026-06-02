import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, CircleAlert, Crown, Database, UserRound } from "lucide-react";
import TalentPlanOverride from "@/app/admin/talents/TalentPlanOverride";
import { getCurrentAdminContext } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Profile, TalentSubscriptionPlan } from "@/lib/types";

type TalentPlanRecord = Profile & {
  email: string | null;
};

type TalentsResult = {
  talents: TalentPlanRecord[];
  error: string | null;
  emailNotice: string | null;
};

const planMeta: Record<
  TalentSubscriptionPlan,
  {
    label: string;
    className: string;
  }
> = {
  free: {
    label: "Free",
    className: "bg-slate-100 text-slate-700 ring-slate-200"
  },
  pro: {
    label: "Pro",
    className: "bg-cyan-50 text-cyan-700 ring-cyan-100"
  },
  vip: {
    label: "VIP",
    className: "bg-violet-50 text-violet-700 ring-violet-100"
  }
};

function normalizePlan(value: string | null | undefined): TalentSubscriptionPlan {
  return value === "pro" || value === "vip" ? value : "free";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "未設定";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "日期待確認";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(parsedDate);
}

function getDisplayName(profile: Profile) {
  return profile.full_name?.trim() || profile.title?.trim() || "未命名人才";
}

async function getAuthEmailByUserId() {
  const supabaseAdmin = createSupabaseAdminClient();
  const emailById = new Map<string, string>();

  if (!supabaseAdmin) {
    return {
      emailById,
      notice: "尚未設定 SUPABASE_SERVICE_ROLE_KEY，Email 欄位暫時無法從 Auth 讀取。"
    };
  }

  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      return {
        emailById,
        notice: `Auth Email 讀取失敗：${error.message}`
      };
    }

    const users = data.users ?? [];

    users.forEach((user) => {
      if (user.email) {
        emailById.set(user.id, user.email);
      }
    });

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return {
    emailById,
    notice: null
  };
}

async function getTalents(): Promise<TalentsResult> {
  const context = await getCurrentAdminContext();

  if (!context.supabase || !context.isSuperAdmin) {
    redirect("/");
  }

  const { data, error } = await context.supabase
    .from("profiles")
    .select("*")
    .eq("account_type", "nomad")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      talents: [],
      error: error.message,
      emailNotice: null
    };
  }

  const { emailById, notice } = await getAuthEmailByUserId();

  return {
    talents: ((data ?? []) as Profile[]).map((profile) => ({
      ...profile,
      email: emailById.get(profile.id) ?? null
    })),
    error: null,
    emailNotice: notice
  };
}

export default async function AdminTalentsPage() {
  const { talents, error, emailNotice } = await getTalents();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Super Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            人才方案控制台
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            檢視求職者的訂閱狀態，並在客服、金流或活動贈送情境下強制調整人才方案。
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
          <Crown className="h-3.5 w-3.5" aria-hidden="true" />
          Super Admin only
        </span>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">人才方案資料讀取失敗。</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      {emailNotice ? (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <p>{emailNotice}</p>
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-3">
        {(["free", "pro", "vip"] as TalentSubscriptionPlan[]).map((plan) => {
          const meta = planMeta[plan];
          const count = talents.filter(
            (talent) => normalizePlan(talent.subscription_plan) === plan
          ).length;

          return (
            <article
              key={plan}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${meta.className}`}>
                  {meta.label}
                </span>
                <Database className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </div>
              <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
                {count}
              </p>
              <p className="mt-2 text-sm text-slate-500">位人才目前使用此方案</p>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">人才全覽列表</h2>
            <p className="text-xs text-slate-500">
              下拉選單會直接寫入 profiles.subscription_plan。
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">姓名 / Email</th>
                <th className="px-6 py-4">專業頭銜</th>
                <th className="px-6 py-4">目前方案</th>
                <th className="px-6 py-4">加入時間</th>
                <th className="px-6 py-4 text-right">Plan Overrider</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {talents.map((talent) => {
                const plan = normalizePlan(talent.subscription_plan);
                const meta = planMeta[plan];
                const displayName = getDisplayName(talent);

                return (
                  <tr key={talent.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-5">
                      <div className="font-semibold text-slate-900">
                        <Link
                          href={`/talents/${talent.id}`}
                          className="hover:text-cyan-700"
                        >
                          {displayName}
                        </Link>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {talent.email ?? "Email 尚未提供"}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-600">
                      {talent.job_title?.trim() || talent.title?.trim() || "尚未提供"}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${meta.className}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        {formatDate(talent.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end">
                        <TalentPlanOverride
                          profileId={talent.id}
                          talentName={displayName}
                          currentPlan={plan}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {talents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">尚無人才資料</p>
            <p className="mt-2 text-sm text-slate-500">
              當求職者完成會員資料後，就會顯示在這裡。
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
