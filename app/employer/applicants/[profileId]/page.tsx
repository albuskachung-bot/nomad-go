import Link from "next/link";
import { ArrowLeft, Briefcase, Globe2, MapPin } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

type ApplicantDetailPageProps = {
  params: Promise<{
    profileId: string;
  }>;
};

export default async function ApplicantDetailPage({ params }: ApplicantDetailPageProps) {
  const { profileId } = await params;
  const supabase = await createSupabaseServerClient();
  let profile: Profile | null = null;

  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    profile = (data as Profile | null) ?? null;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/employer/applicants"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        返回人才篩選器
      </Link>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        {profile ? (
          <>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-xl font-semibold text-white">
                {(profile.full_name ?? "U").slice(0, 1).toUpperCase()}
              </span>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  {profile.full_name ?? "未命名人才"}
                </h1>
                <p className="mt-2 text-base text-gray-500">{profile.title ?? "遠端工作人才"}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-500">
                  {profile.location ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {profile.location}
                    </span>
                  ) : null}
                  {profile.timezone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Globe2 className="h-4 w-4" aria-hidden="true" />
                      {profile.timezone}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
              <div>
                <h2 className="text-base font-semibold text-gray-900">個人簡介</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">
                  {profile.bio ?? "此人才尚未填寫完整簡介。"}
                </p>

                <h2 className="mt-8 text-base font-semibold text-gray-900">技能</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.skills.length > 0 ? (
                    profile.skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">尚未填寫技能。</span>
                  )}
                </div>
              </div>

              <aside className="rounded-xl bg-gray-50 p-5">
                <h2 className="text-base font-semibold text-gray-900">作品與合作偏好</h2>
                {profile.portfolio_url ? (
                  <a
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    查看作品集
                    <Briefcase className="h-4 w-4" aria-hidden="true" />
                  </a>
                ) : (
                  <p className="mt-4 text-sm text-gray-500">尚未提供作品集。</p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  {profile.work_type.map((type) => (
                    <span key={type} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                      {type}
                    </span>
                  ))}
                </div>
              </aside>
            </div>
          </>
        ) : (
          <div className="py-16 text-center text-sm text-gray-500">找不到這位人才的履歷。</div>
        )}
      </section>
    </div>
  );
}
