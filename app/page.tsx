import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Briefcase,
  Clock3,
  Globe2,
  MapPin,
  Megaphone,
  Signal,
  Sparkles,
  Star,
  Users,
  Wifi
} from "lucide-react";
import { getFeaturedJobs, getGuides, getSiteSettings } from "@/lib/data";
import { createSupabasePublicServerClient } from "@/lib/supabase/server";
import type { PlatformPlacement } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getSiteSettings();

  return {
    title: siteSettings.hero_title,
    description: siteSettings.hero_subtitle
  };
}

const talents = [
  {
    name: "Ivy Chen",
    role: "Product Designer",
    timezone: "GMT+8",
    availability: "每週 20 小時",
    skills: ["SaaS UX", "Design System", "Research"]
  },
  {
    name: "Marcus Lin",
    role: "Full-stack Engineer",
    timezone: "GMT+7 / GMT+8",
    availability: "可全職遠端",
    skills: ["Next.js", "Supabase", "API"]
  },
  {
    name: "Nora Wang",
    role: "Content Strategist",
    timezone: "GMT+8",
    availability: "專案制",
    skills: ["SEO", "B2B", "Newsletter"]
  }
];

async function getAnnouncementPlacement() {
  const supabase = createSupabasePublicServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("platform_placements")
    .select("*")
    .eq("location", "announcement_bar")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST205") {
      return null;
    }

    console.error("[home] Unable to load announcement placement.", error);
    return null;
  }

  return data as PlatformPlacement | null;
}

function AnnouncementBar({ placement }: { placement: PlatformPlacement | null }) {
  if (!placement) {
    return null;
  }

  const content = (
    <div className="border-b border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 sm:px-6 lg:px-8">
        <Megaphone className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="font-medium">{placement.title}</span>
        {placement.link_text ? (
          <span className="font-semibold underline-offset-4">{placement.link_text}</span>
        ) : null}
      </div>
    </div>
  );

  if (!placement.link_url) {
    return content;
  }

  return (
    <Link href={placement.link_url} className="block">
      {content}
    </Link>
  );
}

export default async function HomePage() {
  const [featuredJobs, guides, siteSettings, announcementPlacement] = await Promise.all([
    getFeaturedJobs(3),
    getGuides(),
    getSiteSettings(),
    getAnnouncementPlacement()
  ]);

  return (
    <>
      <AnnouncementBar placement={announcementPlacement} />

      <section className="relative isolate min-h-[640px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${siteSettings.hero_image_url}')`
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.32),transparent_34%)]"
          aria-hidden="true"
        />

        <div className="relative mx-auto flex min-h-[640px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-sm font-medium text-blue-600 shadow-sm ring-1 ring-blue-100">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              華語數位遊牧平台 MVP
            </div>
            <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-tight tracking-normal text-white sm:text-6xl lg:text-7xl">
              {siteSettings.hero_title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">
              {siteSettings.hero_subtitle}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/jobs"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
              >
                查看遠端職缺
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/toolkit"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                打開出發工具
                <Globe2 className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-12 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: Briefcase, label: "精選遠端職缺", value: "25+" },
                { icon: MapPin, label: "城市指南", value: "12" },
                { icon: Users, label: "華語人才池", value: "80+" }
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg bg-white/80 p-4 shadow-sm ring-1 ring-gray-100 backdrop-blur"
                >
                  <item.icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
                  <div className="mt-3 text-2xl font-semibold text-gray-900">
                    {item.value}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Remote Jobs
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal text-gray-900">
                精選遠端職缺
              </h2>
            </div>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              查看全部
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {featuredJobs.map((job) => (
              <article
                key={job.id}
                className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100 transition duration-200 hover:-translate-y-1 hover:shadow-soft"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{job.company}</p>
                  </div>
                  <Briefcase className="h-5 w-5 text-blue-600" aria-hidden="true" />
                </div>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-500">
                  {job.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {job.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {job.location}
                  </span>
                  <span className="font-medium text-gray-900">{job.job_type}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              City Guides
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-gray-900">
              城市指南卡片
            </h2>
            <p className="mt-3 text-base leading-7 text-gray-500">
              用預算、網路速度、時區與生活機能快速比較下一個落腳地。
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {guides.slice(0, 3).map((guide) => (
              <article
                key={guide.id}
                className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100 transition duration-200 hover:-translate-y-1 hover:shadow-soft"
              >
                <div
                  className="h-44 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${guide.cover_image_url ?? ""})`
                  }}
                  aria-hidden="true"
                />
                <div className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {guide.city}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {guide.country} · {guide.region}
                      </p>
                    </div>
                    <Star className="h-5 w-5 text-blue-600" aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-gray-500">
                    {guide.summary}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="text-gray-500">月預算</div>
                      <div className="mt-1 font-semibold text-gray-900">
                        USD {guide.monthly_budget_usd?.toLocaleString() ?? "N/A"}
                      </div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="text-gray-500">網速</div>
                      <div className="mt-1 font-semibold text-gray-900">
                        {guide.internet_speed_mbps ?? "N/A"} Mbps
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Talent Pool
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal text-gray-900">
                人才推薦
              </h2>
              <p className="mt-4 text-base leading-7 text-gray-500">
                MVP 版本先提供精選人才展示區，後續可接 Supabase profile 與媒合流程。
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-gray-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-2">
                  <Clock3 className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  時區友善
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-2">
                  <Signal className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  遠端協作
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-2">
                  <Wifi className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  穩定交付
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              {talents.map((talent) => (
                <article
                  key={talent.name}
                  className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-100 transition duration-200 hover:-translate-y-1 hover:shadow-soft"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-600">
                        {talent.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{talent.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">{talent.role}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {talent.timezone} · {talent.availability}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {talent.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
