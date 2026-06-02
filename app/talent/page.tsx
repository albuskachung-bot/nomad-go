import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  ExternalLink,
  Globe2,
  MapPin,
  Sparkles,
  Star,
  UserRound
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

const checklist = [
  "遠端工作技能與作品連結",
  "可合作時區與每週可投入時間",
  "偏好的合作模式與期望職務"
];

export const dynamic = "force-dynamic";

function isVipProfile(profile: Profile) {
  return Boolean(profile.sponsored_until && new Date(profile.sponsored_until) > new Date());
}

function initials(name: string | null) {
  if (!name) {
    return "NG";
  }

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getDisplayName(profile: Profile) {
  return profile.full_name?.trim() || "未命名人才";
}

function getJobTitle(profile: Profile) {
  return profile.job_title?.trim() || profile.title?.trim() || "遠端工作人才";
}

function getSummary(profile: Profile) {
  return profile.bio?.trim() || "這位人才正在補齊遠端履歷。";
}

function getSkills(profile: Profile) {
  return Array.isArray(profile.skills) ? profile.skills.filter(Boolean).slice(0, 5) : [];
}

function getWorkType(profile: Profile) {
  if (!Array.isArray(profile.work_type) || profile.work_type.length === 0) {
    return "開放合作";
  }

  return profile.work_type.slice(0, 2).join(" / ");
}

async function getPublicTalentProfiles() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      profiles: [],
      notice: "尚未設定 Supabase 環境變數，暫時無法讀取公開人才履歷。"
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_public", true)
    .eq("account_type", "nomad")
    .eq("is_banned", false)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[talent] Failed to load public talent profiles.", error);

    return {
      profiles: [],
      notice: "公開人才資料暫時無法讀取，請稍後再試。"
    };
  }

  return {
    profiles: (data ?? []) as Profile[],
    notice: null
  };
}

function TalentCard({ profile }: { profile: Profile }) {
  const isVip = isVipProfile(profile);
  const displayName = getDisplayName(profile);
  const skills = getSkills(profile);

  return (
    <article
      className={`rounded-lg bg-white p-6 transition duration-200 hover:-translate-y-1 ${
        isVip
          ? "border border-blue-500 shadow-md ring-2 ring-blue-100"
          : "shadow-sm ring-1 ring-gray-100 hover:shadow-soft"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-cover bg-center bg-no-repeat text-sm font-semibold ${
              isVip ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
            }`}
            style={
              profile.avatar_url
                ? {
                    backgroundImage: `url(${profile.avatar_url})`
                  }
                : undefined
            }
            aria-label={profile.avatar_url ? `${displayName} 大頭照` : undefined}
          >
            {profile.avatar_url ? null : initials(profile.full_name)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                {displayName}
              </h2>
              {isVip ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-xs font-semibold text-white">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  精選
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm font-medium text-blue-600">
              {getJobTitle(profile)}
            </p>
          </div>
        </div>

        {profile.portfolio_url ? (
          <a
            href={profile.portfolio_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-600"
          >
            作品集
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : null}
      </div>

      <p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-500">
        {getSummary(profile)}
      </p>

      {skills.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 border-t border-gray-100 pt-5 text-sm text-gray-500 sm:grid-cols-3">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-blue-600" aria-hidden="true" />
          {profile.location ?? "Remote"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-4 w-4 text-blue-600" aria-hidden="true" />
          {profile.timezone ?? "Flexible"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Globe2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
          {getWorkType(profile)}
        </span>
      </div>

      <div className="mt-5 flex justify-end">
        <Link
          href={`/talents/${profile.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
        >
          查看詳情
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default async function TalentPage() {
  const { profiles, notice } = await getPublicTalentProfiles();

  return (
    <div className="bg-white">
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Talent Profile
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal text-gray-900 sm:text-5xl">
              人才自薦
            </h1>
            <p className="mt-4 text-lg leading-8 text-gray-500">
              建立可被遠端團隊理解的履歷頁，讓公司快速看見你的技能、時區與合作條件。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {/* Progressive registration:
                 已登入但 Profile 尚未填寫完整時，點擊此 CTA 應引導至 /dashboard/nomad/resume
                 補齊 full_name、bio、skills、location 等資料，而不是在註冊第一步阻擋使用者。 */}
              <Link
                href="/dashboard/nomad/resume"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
              >
                發佈我的履歷
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                升級置頂曝光
                <Star className="h-4 w-4 text-orange-500" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <aside className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <UserRound className="h-6 w-6 text-blue-600" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900">履歷發布前檢查</h2>
            <div className="mt-5 space-y-3">
              {checklist.map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                  <BadgeCheck className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Talent Directory
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-gray-900">
              精選人才列表
            </h2>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
            先瀏覽職缺
          </Link>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {profiles.map((profile) => (
            <TalentCard key={profile.id} profile={profile} />
          ))}
        </div>
        {profiles.length === 0 ? (
          <div className="mt-8 rounded-lg bg-gray-50 px-6 py-12 text-center ring-1 ring-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              目前沒有公開的人才履歷
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {notice ?? "開啟「公開我的履歷」後，履歷就會有機會顯示在這裡。"}
            </p>
            <Link
              href="/dashboard/nomad/resume"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              編輯我的履歷
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
