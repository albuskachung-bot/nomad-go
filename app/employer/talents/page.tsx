import TalentGrid from "@/app/employer/talents/TalentGrid";
import {
  getEmployerWorkspaceContext,
  getWorkspaceErrorMessage,
  isWorkspaceSchemaMissingError
} from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

type PublicTalent = {
  id: string;
  name: string;
  title: string;
  skills: string[];
  timezone: string | null;
  avatarUrl: string | null;
};

function toPublicTalent(profile: Profile): PublicTalent {
  return {
    id: profile.id,
    name: profile.full_name?.trim() || `Nomad ${profile.id.slice(0, 6)}`,
    title: profile.job_title?.trim() || profile.title?.trim() || "數位遊牧人才",
    skills: profile.skills ?? [],
    timezone: profile.timezone,
    avatarUrl: profile.avatar_url
  };
}

function isMissingColumnError(error: unknown, columnName: string) {
  const message = getWorkspaceErrorMessage(error).toLowerCase();
  return (
    isWorkspaceSchemaMissingError(error) &&
    message.includes(columnName.toLowerCase()) &&
    message.includes("column")
  );
}

async function getPublicTalents(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>) {
  const publicProfilesResult = await supabase
    .from("profiles")
    .select("id, full_name, title, job_title, skills, timezone, avatar_url")
    .eq("is_public", true)
    .neq("account_type", "employer")
    .order("created_at", { ascending: false });

  if (!publicProfilesResult.error) {
    return {
      talents: ((publicProfilesResult.data ?? []) as Profile[]).map(toPublicTalent),
      error: null
    };
  }

  if (!isMissingColumnError(publicProfilesResult.error, "is_public")) {
    return {
      talents: [],
      error: getWorkspaceErrorMessage(publicProfilesResult.error)
    };
  }

  const fallbackProfilesResult = await supabase
    .from("profiles")
    .select("id, full_name, title, job_title, skills, timezone, avatar_url")
    .not("job_title", "is", null)
    .neq("account_type", "employer")
    .order("created_at", { ascending: false });

  if (fallbackProfilesResult.error) {
    return {
      talents: [],
      error: getWorkspaceErrorMessage(fallbackProfilesResult.error)
    };
  }

  return {
    talents: ((fallbackProfilesResult.data ?? []) as Profile[]).map(toPublicTalent),
    error: null
  };
}

function PricingPrompt({ planType }: { planType: string }) {
  return (
    <div className="rounded-2xl border border-cyan-100 bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
        Pro Required
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950">
        升級企業 Pro 後即可使用主動尋才
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
        目前方案為 {planType || "free"}。人才庫資料只會在伺服器端確認為 Pro 方案後才查詢與渲染，避免免費帳號取得敏感人才摘要。
      </p>
      <a
        href="/employer/billing"
        className="mt-6 inline-flex rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
      >
        查看升級方案
      </a>
    </div>
  );
}

export default async function EmployerTalentsPage() {
  const supabase = await createSupabaseServerClient();
  let content;

  if (!supabase) {
    content = (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        尚未設定 Supabase 環境變數，無法讀取企業方案。
      </div>
    );
  } else {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      content = <PricingPrompt planType="free" />;
    } else {
      const workspace = await getEmployerWorkspaceContext(supabase, user.id);
      const company = workspace.context?.company ?? null;
      const planType = company?.subscription_plan ?? "free";

      if (workspace.error) {
        content = (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            {workspace.error}
          </div>
        );
      } else if (planType !== "pro") {
        content = <PricingPrompt planType={planType} />;
      } else {
        const { talents, error } = await getPublicTalents(supabase);

        content = (
          <TalentGrid
            talents={talents}
            error={error}
          />
        );
      }
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Discover Talents
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            主動尋才
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            探索並邀請頂尖的全球華語數位遊牧人才加入您的團隊。
          </p>
        </div>

        <div id="talent-grid-container" className="mt-8">
          {content}
        </div>
      </section>
    </main>
  );
}
