import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Globe2,
  MapPin,
  Sparkles,
  Users,
  Wifi
} from "lucide-react";
import {
  getApprovedCompanyProfile,
  getCompanySummary,
  getWebsiteHref
} from "@/lib/company-directory";

type CompanyDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: CompanyDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await getApprovedCompanyProfile(id);

  if (!profile) {
    return {
      title: "找不到企業 | NOMAD-GO"
    };
  }

  return {
    title: `${profile.company.name} | NOMAD-GO 企業專頁`,
    description: getCompanySummary(profile.company.description, 140)
  };
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { id } = await params;
  const profile = await getApprovedCompanyProfile(id);

  if (!profile) {
    notFound();
  }

  const { company, publishedJobs, benefitTags, industry } = profile;
  const websiteHref = getWebsiteHref(company.website);
  const remotePolicy =
    company.remote_policy ?? "此企業尚未補充遠距政策，請參考下方職缺內容或後續面談資訊。";

  return (
    <div className="bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/companies"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回企業總覽
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {company.logo_url ? (
                  <div
                    className="h-20 w-20 rounded-lg bg-gray-100 bg-contain bg-center bg-no-repeat ring-1 ring-gray-200"
                    style={{ backgroundImage: `url(${company.logo_url})` }}
                    aria-hidden="true"
                  />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <Building2 className="h-9 w-9" aria-hidden="true" />
                  </span>
                )}

                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                    Approved Employer
                  </p>
                  <h1 className="mt-2 text-4xl font-semibold tracking-normal text-gray-900 sm:text-5xl">
                    {company.name}
                  </h1>
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoPill icon={Sparkles} label="產業類別" value={industry} />
                <InfoPill icon={Users} label="公司規模" value={company.company_size ?? "尚未提供"} />
                <InfoPill icon={MapPin} label="總部位置" value={company.headquarters ?? "尚未提供"} />
                <InfoPill icon={BriefcaseBusiness} label="開放職缺" value={`${publishedJobs.length} 個`} />
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-5 ring-1 ring-gray-100">
              <p className="text-sm font-semibold text-gray-900">官方網站</p>
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  <Globe2 className="h-4 w-4" aria-hidden="true" />
                  {company.website}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              ) : (
                <p className="mt-3 text-sm text-gray-500">尚未提供官網連結</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="space-y-6">
          <section className="rounded-lg bg-white p-7 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-2xl font-semibold tracking-normal text-gray-900">
              文化與公司介紹
            </h2>
            <p className="mt-5 whitespace-pre-line text-base leading-8 text-gray-600">
              {company.description ?? "這間企業正在完善品牌介紹，歡迎先查看目前開放的遠端職缺。"}
            </p>
          </section>

          <section className="rounded-lg bg-white p-7 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <h2 className="text-2xl font-semibold tracking-normal text-gray-900">
                遠距政策
              </h2>
            </div>
            <p className="mt-5 text-base leading-8 text-gray-600">{remotePolicy}</p>
          </section>

          <section className="rounded-lg bg-white p-7 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-2xl font-semibold tracking-normal text-gray-900">
              福利標籤
            </h2>
            {benefitTags.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {benefitTags.map((benefit) => (
                  <span
                    key={benefit}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                  >
                    {benefit}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-gray-500">
                此企業尚未補充福利標籤，請參考下方職缺描述。
              </p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-base font-semibold text-gray-900">企業摘要</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <SummaryRow label="產業" value={industry} />
              <SummaryRow label="規模" value={company.company_size ?? "尚未提供"} />
              <SummaryRow label="總部" value={company.headquarters ?? "尚未提供"} />
              <SummaryRow label="職缺" value={`${publishedJobs.length} 個上架中`} />
            </dl>
          </div>
        </aside>
      </section>

      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Open Roles
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal text-gray-900">
                現有職缺清單
              </h2>
            </div>
            <Link
              href="/jobs"
              className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              查看所有遠端職缺
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {publishedJobs.length > 0 ? (
            <div className="grid gap-4">
              {publishedJobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100 transition duration-200 hover:-translate-y-1 hover:shadow-soft"
                >
                  <div className="flex flex-col justify-between gap-5 md:flex-row">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                          {job.job_type}
                        </span>
                        {job.salary_range ? (
                          <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                            {job.salary_range}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-4 text-2xl font-semibold tracking-normal text-gray-900">
                        <Link href={`/jobs/${job.id}`} className="hover:text-blue-600">
                          {job.title}
                        </Link>
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="h-4 w-4" aria-hidden="true" />
                          {company.name}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" aria-hidden="true" />
                          {job.location}
                        </span>
                      </div>
                      <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-500">
                        {job.description}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {job.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Link
                      href={`/jobs/${job.id}`}
                      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-600"
                    >
                      查看詳情
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 px-6 py-12 text-center ring-1 ring-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                目前沒有上架中的職缺
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                你可以稍後回來查看，或先瀏覽其他遠端友善企業。
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoPill({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4 ring-1 ring-gray-100">
      <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
      <p className="mt-3 text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-semibold text-gray-900">{value}</dd>
    </div>
  );
}
