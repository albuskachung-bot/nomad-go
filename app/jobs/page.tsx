import Link from "next/link";
import { Fragment } from "react";
import {
  ArrowUpRight,
  Building2,
  MapPin,
  Search,
  SlidersHorizontal
} from "lucide-react";
import { filterJobs, getJobs } from "@/lib/data";
import { createSupabasePublicServerClient } from "@/lib/supabase/server";
import type { PlatformPlacement } from "@/lib/types";

type JobsPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    type?: string | string[];
    location?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

async function getInFeedAds() {
  const supabase = createSupabasePublicServerClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("platform_placements")
    .select("*")
    .eq("location", "in_feed_ad")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    if (error.code === "PGRST205") {
      return [];
    }

    console.error("[jobs] Unable to load in-feed ads.", error);
    return [];
  }

  return (data ?? []) as PlatformPlacement[];
}

function InFeedAdCard({ ad }: { ad: PlatformPlacement }) {
  const content = (
    <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4">
      {ad.image_url ? (
        <div
          className="h-44 rounded-lg bg-cover bg-center"
          style={{ backgroundImage: `url('${ad.image_url}')` }}
          aria-hidden="true"
        />
      ) : null}
      <div className={ad.image_url ? "mt-4" : ""}>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
          Sponsored
        </p>
        <h3 className="mt-2 text-lg font-semibold text-gray-900">{ad.title}</h3>
        {ad.subtitle ? (
          <p className="mt-2 text-sm leading-6 text-gray-500">{ad.subtitle}</p>
        ) : null}
        {ad.link_text ? (
          <span className="mt-4 inline-flex text-sm font-semibold text-blue-600">
            {ad.link_text}
          </span>
        ) : null}
      </div>
    </div>
  );

  if (!ad.link_url) {
    return content;
  }

  return (
    <Link href={ad.link_url} className="block">
      {content}
    </Link>
  );
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const params = searchParams ? await searchParams : {};
  const [allJobs, inFeedAds] = await Promise.all([getJobs(), getInFeedAds()]);
  const query = readParam(params.q) ?? "";
  const type = readParam(params.type) ?? "";
  const location = readParam(params.location) ?? "";
  const jobTypes = Array.from(new Set(allJobs.map((job) => job.job_type)));
  const jobs = filterJobs(allJobs, { query, type, location });

  return (
    <div className="bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Remote Jobs
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal text-gray-900 sm:text-5xl">
              遠端職缺
            </h1>
            <p className="mt-4 text-lg leading-8 text-gray-500">
              篩選全職遠端、合約與兼職機會，快速找到適合華語人才與亞洲時區的工作。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[320px_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <form action="/jobs" className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
              <SlidersHorizontal className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <h2 className="font-semibold text-gray-900">篩選職缺</h2>
            </div>

            <label className="mt-5 block text-sm font-medium text-gray-900" htmlFor="q">
              關鍵字
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
              <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="React、SEO、Designer"
                className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>

            <label className="mt-5 block text-sm font-medium text-gray-900" htmlFor="type">
              工作型態
            </label>
            <select
              id="type"
              name="type"
              defaultValue={type}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">全部型態</option>
              {jobTypes.map((jobType) => (
                <option key={jobType} value={jobType}>
                  {jobType}
                </option>
              ))}
            </select>

            <label
              className="mt-5 block text-sm font-medium text-gray-900"
              htmlFor="location"
            >
              地點 / 時區
            </label>
            <input
              id="location"
              name="location"
              defaultValue={location}
              placeholder="APAC、Taiwan、Global"
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />

            <button
              type="submit"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
            >
              套用篩選
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </aside>

        <div>
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {jobs.length} 個符合條件的職缺
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                目前資料會優先讀取 Supabase，未設定時使用內建 mock data。
              </p>
            </div>
            <Link href="/jobs" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              清除篩選
            </Link>
          </div>

          <div className="grid gap-4">
            {jobs.map((job, index) => {
              const adIndex = Math.floor(index / 5);
              const ad = (index + 1) % 5 === 0 ? inFeedAds[adIndex] : null;

              return (
                <Fragment key={job.id}>
                  <article className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100 transition duration-200 hover:-translate-y-1 hover:shadow-soft">
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
                            {job.company}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" aria-hidden="true" />
                            {job.location}
                          </span>
                        </div>
                        <p className="mt-4 mb-4 line-clamp-3 max-w-3xl whitespace-pre-line text-sm leading-6 text-gray-600">
                          {job.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
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

                  {ad ? <InFeedAdCard ad={ad} /> : null}
                </Fragment>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
