import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, BriefcaseBusiness, Building2, Search } from "lucide-react";
import {
  getApprovedCompanyCards,
  getCompanyIndustry,
  getCompanySummary
} from "@/lib/company-directory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "企業總覽大廳 | NOMAD-GO",
  description: "探索已通過 NOMAD-GO 審核的遠端友善企業與目前開放職缺。"
};

export default async function CompaniesPage() {
  const companyCards = await getApprovedCompanyCards();
  const totalOpenRoles = companyCards.reduce(
    (total, item) => total + item.publishedJobCount,
    0
  );

  return (
    <div className="bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Company Hall
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-normal text-gray-900 sm:text-5xl">
                企業總覽大廳
              </h1>
              <p className="mt-4 text-lg leading-8 text-gray-500">
                瀏覽已通過平台審核的遠端友善企業，從品牌文化、福利與開放職缺找到下一個適合你的團隊。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-5 ring-1 ring-gray-100">
                <p className="text-sm font-medium text-gray-500">已核准企業</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {companyCards.length}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-5 ring-1 ring-blue-100">
                <p className="text-sm font-medium text-blue-700">上架中職缺</p>
                <p className="mt-2 text-3xl font-semibold text-blue-700">
                  {totalOpenRoles}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">精選雇主品牌</h2>
            <p className="mt-1 text-sm text-gray-500">
              僅顯示已通過入駐審核的企業與公開上架職缺。
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            直接瀏覽所有職缺
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {companyCards.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {companyCards.map(({ company, publishedJobCount }) => (
              <Link
                key={company.id}
                href={`/companies/${company.id}`}
                className="group rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100 transition duration-200 hover:-translate-y-1 hover:shadow-soft"
              >
                <article>
                  <div className="flex items-start justify-between gap-4">
                    {company.logo_url ? (
                      <div
                        className="h-14 w-14 rounded-lg bg-gray-100 bg-contain bg-center bg-no-repeat ring-1 ring-gray-200"
                        style={{ backgroundImage: `url(${company.logo_url})` }}
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-900 text-white">
                        <Building2 className="h-6 w-6" aria-hidden="true" />
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />
                      {publishedJobCount} 個職缺
                    </span>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {getCompanyIndustry(company)}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-normal text-gray-900 group-hover:text-blue-600">
                      {company.name}
                    </h3>
                    <p className="mt-4 min-h-[72px] text-sm leading-6 text-gray-500">
                      {getCompanySummary(company.description)}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                    <span className="text-sm font-semibold text-gray-900">
                      查看企業專頁
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 text-gray-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-600"
                      aria-hidden="true"
                    />
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-white px-6 py-14 text-center shadow-sm ring-1 ring-gray-100">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Search className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-gray-900">
              目前尚無公開企業
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
              企業通過入駐審核後會顯示在這裡；你也可以先查看目前上架中的遠端職缺。
            </p>
            <Link
              href="/jobs"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              前往職缺列表
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
