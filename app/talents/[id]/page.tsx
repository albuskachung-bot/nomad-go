import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Globe2,
  Lock,
  MapPin,
  UserRound,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  PenLine,
  type LucideIcon
} from "lucide-react";
import { getEmployerWorkspaceContext } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Post, Profile } from "@/lib/types";

type TalentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

type PublishedArticle = Pick<
  Post,
  "id" | "title" | "slug" | "cover_image_url" | "updated_at"
>;

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

function getWorkType(profile: Profile) {
  return Array.isArray(profile.work_type) && profile.work_type.length > 0
    ? profile.work_type.join(" / ")
    : "開放合作";
}

function formatDate(value: string) {
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

async function getPublicTalentProfile(profileId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .eq("is_banned", false)
    .maybeSingle();

  if (error) {
    console.error("[talents/detail] Failed to load public talent profile.", error);
    return null;
  }

  return (data as Profile | null) ?? null;
}

async function getPublishedArticles(profileId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return [] as PublishedArticle[];
  }

  const { data, error } = await supabase
    .from("posts")
    .select("id,title,slug,cover_image_url,updated_at")
    .eq("author_id", profileId)
    .eq("is_published", true)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[talents/detail] Failed to load published articles.", error);
    return [] as PublishedArticle[];
  }

  return (data ?? []) as PublishedArticle[];
}

async function canViewFullTalentProfile(profileId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return false;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  if (user.id === profileId) {
    return true;
  }

  const workspace = await getEmployerWorkspaceContext(supabase, user.id);

  if (!workspace.context) {
    return false;
  }

  const { data, error } = await supabase
    .from("profile_views")
    .select("id")
    .eq("target_user_id", profileId)
    .eq("viewer_company_id", workspace.context.company.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[talents/detail] Failed to verify profile unlock.", error);
    return false;
  }

  return Boolean(data);
}

function TalentProfilePaywall() {
  return (
    <section className="rounded-lg border border-blue-100 bg-white p-7 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold tracking-normal text-gray-900">
            完整履歷已鎖定
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            公開頁面僅顯示人才摘要。企業需透過主動尋才頁解鎖後，才能查看完整自我介紹、作品集與進階合作資訊。
          </p>
          <Link
            href="/employer/talents"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            前往主動尋才解鎖
          </Link>
        </div>
      </div>
    </section>
  );
}

export default async function TalentDetailPage({ params }: TalentDetailPageProps) {
  const { id } = await params;
  const profile = await getPublicTalentProfile(id);

  if (!profile) {
    notFound();
  }

  const publishedArticles = await getPublishedArticles(profile.id);
  const canViewFullProfile =
    profile.is_virtual_author === true || (await canViewFullTalentProfile(profile.id));
  const canRenderAuthorProfile =
    profile.is_public === true ||
    profile.is_virtual_author === true ||
    publishedArticles.length > 0;

  if (!canRenderAuthorProfile) {
    notFound();
  }

  const displayName = getDisplayName(profile);
  const skills = Array.isArray(profile.skills) ? profile.skills.filter(Boolean) : [];
  const visibleSkills = canViewFullProfile ? skills : skills.slice(0, 3);

  return (
    <div className="bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/talent"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回精選人才列表
          </Link>

          {profile.banner_url ? (
            <div
              className="mt-6 h-48 rounded-xl bg-gray-100 bg-cover bg-center bg-no-repeat md:h-64"
              style={{ backgroundImage: `url(${profile.banner_url})` }}
              aria-label={`${displayName} 個人橫幅`}
            />
          ) : null}

          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-blue-50 bg-cover bg-center bg-no-repeat text-lg font-semibold text-blue-600 ring-1 ring-blue-100"
                style={
                  profile.avatar_url
                    ? { backgroundImage: `url(${profile.avatar_url})` }
                    : undefined
                }
              >
                {profile.avatar_url ? null : initials(profile.full_name)}
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                  Public Talent Profile
                </p>
                <h1 className="mt-2 text-4xl font-semibold tracking-normal text-gray-900">
                  {displayName}
                </h1>
                <p className="mt-2 text-lg font-medium text-blue-600">
                  {getJobTitle(profile)}
                </p>
              </div>
            </div>

            {canViewFullProfile && profile.portfolio_url ? (
              <a
                href={profile.portfolio_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-600"
              >
                查看作品集
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : profile.portfolio_url ? (
              <Link
                href="/employer/talents"
                className="inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                解鎖作品集
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <div className="space-y-6">
          {canViewFullProfile ? (
            <section className="rounded-lg bg-white p-7 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-2xl font-semibold tracking-normal text-gray-900">
                自我介紹
              </h2>
              <p className="mt-5 whitespace-pre-line text-base leading-8 text-gray-600">
                {profile.bio ?? "這位人才正在補齊自我介紹。"}
              </p>
            </section>
          ) : (
            <TalentProfilePaywall />
          )}

          <section className="rounded-lg bg-white p-7 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-2xl font-semibold tracking-normal text-gray-900">
              專業技能
            </h2>
            {visibleSkills.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {visibleSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                  >
                    {skill}
                  </span>
                ))}
                {!canViewFullProfile && skills.length > visibleSkills.length ? (
                  <span className="rounded-full border border-dashed border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    +{skills.length - visibleSkills.length} 個技能待解鎖
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="mt-5 text-sm text-gray-500">尚未提供技能標籤。</p>
            )}
          </section>

          {publishedArticles.length > 0 ? (
            <section className="rounded-lg bg-white p-7 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-2xl font-semibold tracking-normal text-gray-900">
                遊牧專欄
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {publishedArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/blog/${article.slug}`}
                    className="group overflow-hidden rounded-xl border border-gray-100 bg-gray-50 transition hover:-translate-y-0.5 hover:border-blue-100 hover:bg-white hover:shadow-sm"
                  >
                    {article.cover_image_url ? (
                      <div
                        className="h-32 bg-gray-100 bg-cover bg-center"
                        style={{ backgroundImage: `url(${article.cover_image_url})` }}
                        aria-label={`${article.title} 封面圖`}
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center bg-blue-50 text-blue-700">
                        <PenLine className="h-7 w-7" aria-hidden="true" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="line-clamp-2 font-semibold leading-6 text-gray-900 group-hover:text-blue-700">
                        {article.title}
                      </h3>
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatDate(article.updated_at)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <UserRound className="h-6 w-6 text-blue-600" aria-hidden="true" />
            <h2 className="mt-4 text-base font-semibold text-gray-900">合作資訊</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <SummaryRow
                icon={MapPin}
                label="所在地"
                value={profile.location ?? "Remote"}
              />
              <SummaryRow
                icon={Clock3}
                label="所在時區"
                value={profile.timezone ?? "Flexible"}
              />
              <SummaryRow
                icon={Globe2}
                label="偏好型態"
                value={getWorkType(profile)}
              />
              <SummaryRow
                icon={BriefcaseBusiness}
                label="作品集"
                value={
                  profile.portfolio_url
                    ? canViewFullProfile
                      ? "已提供"
                      : "解鎖後可見"
                    : "尚未提供"
                }
              />
            </dl>
          </div>
        </aside>
      </section>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
      <div>
        <dt className="text-gray-500">{label}</dt>
        <dd className="mt-1 font-semibold text-gray-900">{value}</dd>
      </div>
    </div>
  );
}
