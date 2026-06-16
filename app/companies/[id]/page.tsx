import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, Globe2, MapPin } from "lucide-react";
import { createSupabasePublicServerClient } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

type CompanyBrandProfile = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  website_url?: string | null;
  industry: string | null;
  subscription_plan: string | null;
  approval_status: string;
};

type CompanyPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getWebsiteHref(value: string | null | undefined) {
  const website = value?.trim();

  if (!website) {
    return null;
  }

  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

async function getCompanyProfile(companyId: string) {
  const supabase = createSupabasePublicServerClient();

  if (!supabase) {
    return null;
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select(
      "id, name, description, logo_url, website, website_url, industry, subscription_plan, approval_status"
    )
    .eq("id", companyId)
    .eq("approval_status", "approved")
    .maybeSingle();

  if (companyError) {
    console.error("[companies/detail] Unable to load approved company.", companyError);
    return null;
  }

  if (!company) {
    return null;
  }

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, title, location, employment_type, job_type, salary_range, tags, status, company_id")
    .eq("company_id", company.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (jobsError) {
    console.error("[companies/detail] Unable to load company jobs.", jobsError);
  }

  return {
    company: company as CompanyBrandProfile,
    jobs: (jobs ?? []) as Pick<
      Job,
      "id" | "title" | "location" | "employment_type" | "job_type" | "salary_range" | "tags"
    >[]
  };
}

export async function generateMetadata({ params }: CompanyPageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await getCompanyProfile(id);

  if (!profile) {
    return {
      title: "找不到企業 | NOMAD-GO"
    };
  }

  return {
    title: `${profile.company.name} | NOMAD-GO 企業品牌專頁`,
    description:
      profile.company.description ??
      "探索 NOMAD-GO 上已通過審核的遠端友善企業。"
  };
}

export default async function CompanyBrandPage({ params }: CompanyPageProps) {
  const { id } = await params;
  const profile = await getCompanyProfile(id);

  if (!profile) {
    notFound();
  }

  const { company, jobs } = profile;
  const industry = company.industry?.trim() || "遠端友善企業";
  const website = company.website_url ?? company.website;
  const websiteHref = getWebsiteHref(website);
  const isProCompany = company.subscription_plan === "pro";
  const initial = company.name.trim().charAt(0).toUpperCase() || "N";

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/companies"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回企業總覽
          </Link>

          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
              {company.logo_url ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                  <Image
                    src={company.logo_url}
                    alt={`${company.name} logo`}
                    fill
                    sizes="80px"
                    className="object-contain p-3"
                    unoptimized
                  />
                </div>
              ) : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-3xl font-semibold text-white">
                  {initial}
                </span>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                    {industry}
                  </span>
                  {isProCompany ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                      ✨ 認證遊牧雇主 (Verified Pro)
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-3 text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
                  {company.name}
                </h1>
              </div>
            </div>

            {websiteHref ? (
              <a
                href={websiteHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                <Globe2 className="h-4 w-4" aria-hidden="true" />
                前往官方網站
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <div className="space-y-6">
          <article className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
              關於我們
            </h2>
            <p className="mt-5 whitespace-pre-line text-base leading-8 text-slate-600">
              {company.description ??
                "這間企業正在完善品牌介紹。你可以先查看下方目前招募中的遠端職缺，或稍後回來了解更多企業文化與團隊資訊。"}
            </p>
          </article>

          <article className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                  Open Roles
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
                  目前招募中的遠端職缺
                </h2>
              </div>
              <Link
                href="/jobs"
                className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
              >
                查看全部職缺
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            {jobs.length > 0 ? (
              <div className="mt-6 grid gap-3">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="group rounded-lg border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="text-base font-semibold text-slate-950 group-hover:text-blue-700">
                          {job.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" aria-hidden="true" />
                            {job.location || "Remote"}
                          </span>
                          <span>{job.employment_type ?? job.job_type ?? "遠端職缺"}</span>
                          {job.salary_range ? <span>{job.salary_range}</span> : null}
                        </div>
                      </div>
                      <ArrowUpRight
                        className="h-4 w-4 text-slate-400 transition group-hover:text-blue-600"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-lg bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500 ring-1 ring-slate-100">
                目前尚無公開職缺，或職缺撈取邏輯建置中。
              </p>
            )}
          </article>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-950">企業摘要</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <SummaryRow label="產業" value={industry} />
              <SummaryRow label="認證狀態" value={isProCompany ? "Verified Pro" : "Approved"} />
              <SummaryRow label="公開職缺" value={`${jobs.length} 個`} />
            </dl>
            <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm leading-6 text-blue-900 ring-1 ring-blue-100">
              <div className="flex items-center gap-2 font-semibold">
                <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                遠端友善雇主
              </div>
              <p className="mt-2 text-blue-800">
                此企業已通過 NOMAD-GO 入駐審核，可放心查看品牌資訊與公開職缺。
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-slate-950">{value}</dd>
    </div>
  );
}
