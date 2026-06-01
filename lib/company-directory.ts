import { mockJobs } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Company, Job } from "@/lib/types";

export type CompanyDirectoryCard = {
  company: Company;
  publishedJobCount: number;
};

export type CompanyProfile = {
  company: Company;
  publishedJobs: Job[];
  benefitTags: string[];
  industry: string;
};

const mockCompanies: Company[] = [
  {
    id: "cloud-harbor",
    employer_id: "mock-employer-cloud-harbor",
    name: "Cloud Harbor",
    logo_url: null,
    website: "https://cloudharbor.example.com",
    description: "提供 APAC 企業遠端協作與人才管理 SaaS，團隊橫跨台北、新加坡與東京。",
    approval_status: "approved",
    industry: "SaaS / Remote Collaboration",
    company_size: "51-200 人",
    headquarters: "Taipei / Singapore",
    remote_policy: "Remote-first，核心協作時段以亞洲時區為主，支援跨國非同步工作。",
    benefit_tags: ["彈性工時", "遠端設備補助", "年度學習預算"],
    tax_id: null,
    verification_doc_url: null,
    created_at: "2026-05-22T03:10:00.000Z",
    updated_at: "2026-05-22T03:10:00.000Z"
  },
  {
    id: "atlas-work-os",
    employer_id: "mock-employer-atlas-work-os",
    name: "Atlas Work OS",
    logo_url: null,
    website: "https://atlaswork.example.com",
    description: "打造遠端產品團隊的一體化工作系統，聚焦設計、產品與工程交付流程。",
    approval_status: "approved",
    industry: "Productivity / Work OS",
    company_size: "11-50 人",
    headquarters: "Remote / APAC",
    remote_policy: "Fully remote，支援 UTC+6 至 UTC+10 團隊協作。",
    benefit_tags: ["遠端合約", "彈性排程", "可長期合作"],
    tax_id: null,
    verification_doc_url: null,
    created_at: "2026-05-05T08:00:00.000Z",
    updated_at: "2026-05-05T08:00:00.000Z"
  }
];

function getMockJobsForCompany(company: Company) {
  return mockJobs
    .filter((job) => job.status === "published" && job.company === company.name)
    .map((job) => ({ ...job, company_id: company.id }));
}

function groupJobsByCompanyId(jobs: Job[]) {
  return jobs.reduce<Map<string, Job[]>>((groupedJobs, job) => {
    if (!job.company_id) {
      return groupedJobs;
    }

    const currentJobs = groupedJobs.get(job.company_id) ?? [];
    currentJobs.push(job);
    groupedJobs.set(job.company_id, currentJobs);
    return groupedJobs;
  }, new Map<string, Job[]>());
}

function splitTextTags(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getCompanySummary(description: string | null | undefined, maxLength = 96) {
  if (!description) {
    return "這間企業正在完善品牌資訊，歡迎先查看目前開放的遠端職缺。";
  }

  if (description.length <= maxLength) {
    return description;
  }

  return `${description.slice(0, maxLength)}...`;
}

export function getWebsiteHref(website: string | null | undefined) {
  if (!website) {
    return null;
  }

  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

export function getCompanyIndustry(company: Company, jobs: Job[] = []) {
  return company.industry ?? jobs.find((job) => job.category)?.category ?? "遠端友善企業";
}

export function getCompanyBenefitTags(company: Company, jobs: Job[] = []) {
  if (company.benefit_tags?.length) {
    return company.benefit_tags;
  }

  const tags = jobs.flatMap((job) => splitTextTags(job.benefits));
  return Array.from(new Set(tags)).slice(0, 8);
}

export async function getApprovedCompanyCards(): Promise<CompanyDirectoryCard[]> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return mockCompanies.map((company) => ({
      company,
      publishedJobCount: getMockJobsForCompany(company).length
    }));
  }

  const { data: companyRows, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false });

  if (companyError) {
    console.error("[companies] Unable to load approved companies.", companyError);
    return [];
  }

  const companies = (companyRows ?? []) as Company[];
  const companyIds = companies.map((company) => company.id);

  if (companyIds.length === 0) {
    return [];
  }

  const { data: jobRows, error: jobsError } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "published")
    .in("company_id", companyIds)
    .order("created_at", { ascending: false });

  if (jobsError) {
    console.error("[companies] Unable to load published jobs for companies.", jobsError);
  }

  const jobsByCompanyId = groupJobsByCompanyId((jobRows ?? []) as Job[]);

  return companies.map((company) => ({
    company,
    publishedJobCount: jobsByCompanyId.get(company.id)?.length ?? 0
  }));
}

export async function getApprovedCompanyProfile(companyId: string): Promise<CompanyProfile | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const company = mockCompanies.find((item) => item.id === companyId) ?? null;

    if (!company) {
      return null;
    }

    const publishedJobs = getMockJobsForCompany(company);

    return {
      company,
      publishedJobs,
      benefitTags: getCompanyBenefitTags(company, publishedJobs),
      industry: getCompanyIndustry(company, publishedJobs)
    };
  }

  const { data: companyRow, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .eq("approval_status", "approved")
    .maybeSingle();

  if (companyError) {
    console.error("[companies] Unable to load approved company profile.", companyError);
    return null;
  }

  if (!companyRow) {
    return null;
  }

  const company = companyRow as Company;
  const { data: jobRows, error: jobsError } = await supabase
    .from("jobs")
    .select("*")
    .eq("company_id", company.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (jobsError) {
    console.error("[companies] Unable to load published company jobs.", jobsError);
  }

  const publishedJobs = (jobRows ?? []) as Job[];

  return {
    company,
    publishedJobs,
    benefitTags: getCompanyBenefitTags(company, publishedJobs),
    industry: getCompanyIndustry(company, publishedJobs)
  };
}
