import { supabase } from "@/lib/supabase/client";
import type { Guide, Job, Profile, SiteSettings, Talent, Tool } from "@/lib/types";

export const mockJobs: Job[] = [
  {
    id: "job-001",
    title: "Senior Frontend Engineer",
    company: "Cloud Harbor",
    location: "Remote / APAC",
    job_type: "全職遠端",
    salary_range: "USD 72k - 110k",
    tags: ["React", "TypeScript", "SaaS"],
    description:
      "與跨時區產品團隊合作，負責設計系統、前台效能與核心儀表板體驗。",
    apply_url: "https://example.com/jobs/frontend",
    is_featured: true,
    employer_id: null,
    rejection_reason: null,
    status: "published",
    created_at: "2026-05-10T08:00:00.000Z"
  },
  {
    id: "job-002",
    title: "Growth Marketing Manager",
    company: "Remote Ledger",
    location: "Remote / Taiwan friendly",
    job_type: "全職遠端",
    salary_range: "USD 55k - 82k",
    tags: ["B2B", "SEO", "Analytics"],
    description:
      "規劃華語與東南亞市場的內容成長策略，建立可追蹤的獲客漏斗。",
    apply_url: "https://example.com/jobs/growth",
    is_featured: true,
    employer_id: null,
    rejection_reason: null,
    status: "published",
    created_at: "2026-05-08T08:00:00.000Z"
  },
  {
    id: "job-003",
    title: "Product Designer",
    company: "Atlas Work OS",
    location: "Remote / UTC+6 to UTC+10",
    job_type: "合約",
    salary_range: "USD 45 - 70 / hr",
    tags: ["Figma", "Design System", "B2B"],
    description:
      "負責遠端協作產品的端到端 UX，從探索、原型到高保真 UI 交付。",
    apply_url: "https://example.com/jobs/designer",
    is_featured: true,
    employer_id: null,
    rejection_reason: null,
    status: "published",
    created_at: "2026-05-05T08:00:00.000Z"
  },
  {
    id: "job-004",
    title: "Customer Success Specialist",
    company: "Nomad Stack",
    location: "Remote / SEA",
    job_type: "兼職",
    salary_range: "USD 24 - 36 / hr",
    tags: ["CRM", "English", "Onboarding"],
    description:
      "協助全球使用者導入遠端工具，整理常見問題並回饋產品團隊。",
    apply_url: "https://example.com/jobs/success",
    is_featured: false,
    employer_id: null,
    rejection_reason: null,
    status: "pending",
    created_at: "2026-05-03T08:00:00.000Z"
  },
  {
    id: "job-005",
    title: "Backend Engineer",
    company: "Async Finance",
    location: "Remote / Global",
    job_type: "全職遠端",
    salary_range: "USD 88k - 130k",
    tags: ["Node.js", "PostgreSQL", "Fintech"],
    description:
      "打造多幣別帳務服務與可靠 API，需熟悉資料建模與 observability。",
    apply_url: "https://example.com/jobs/backend",
    is_featured: false,
    employer_id: null,
    rejection_reason: "職缺描述不足，請補充遠端協作與薪資區間資訊。",
    status: "rejected",
    created_at: "2026-04-28T08:00:00.000Z"
  }
];

export const mockGuides: Guide[] = [
  {
    id: "guide-001",
    city: "清邁",
    country: "泰國",
    region: "東南亞",
    summary: "低生活成本、咖啡廳密度高，適合第一次嘗試數位遊牧。",
    cover_image_url:
      "https://images.unsplash.com/photo-1599708153386-62bf3f035c96?auto=format&fit=crop&w=1200&q=80",
    monthly_budget_usd: 1200,
    internet_speed_mbps: 120,
    timezone: "GMT+7",
    tags: ["低預算", "社群", "咖啡廳"],
    is_featured: true,
    status: "published",
    created_at: "2026-04-20T08:00:00.000Z"
  },
  {
    id: "guide-002",
    city: "里斯本",
    country: "葡萄牙",
    region: "歐洲",
    summary: "歐洲時區友善、國際社群成熟，適合接歐美客戶的遠端工作者。",
    cover_image_url:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80",
    monthly_budget_usd: 2600,
    internet_speed_mbps: 150,
    timezone: "GMT+1",
    tags: ["歐洲", "社群", "簽證"],
    is_featured: true,
    status: "published",
    created_at: "2026-04-18T08:00:00.000Z"
  },
  {
    id: "guide-003",
    city: "台北",
    country: "台灣",
    region: "東亞",
    summary: "交通便利、醫療與生活機能穩定，是亞洲遠端工作樞紐之一。",
    cover_image_url:
      "https://images.unsplash.com/photo-1470004914212-05527e49370b?auto=format&fit=crop&w=1200&q=80",
    monthly_budget_usd: 2100,
    internet_speed_mbps: 180,
    timezone: "GMT+8",
    tags: ["機能", "安全", "美食"],
    is_featured: true,
    status: "published",
    created_at: "2026-04-16T08:00:00.000Z"
  }
];

export const mockTools: Tool[] = [
  {
    id: "tool-001",
    name: "全球漫遊 eSIM 上網方案",
    category: "跨國網路與通訊",
    description:
      "提供日本、泰國等地的高速上網方案，隨買隨掃即用，免換實體卡，落地立刻連線上工。",
    url: "https://example.com/tools/esim",
    pricing: null,
    warning:
      "剛剛確認 esim 須於購買後 30 天內完成安裝與啟用，逾期將無法使用。",
    tags: ["eSIM", "上網", "通訊"],
    is_featured: true,
    created_at: "2026-05-12T08:00:00.000Z"
  },
  {
    id: "tool-002",
    name: "Google AI Pro & Claude.ai",
    category: "生產力與大腦擴充",
    description:
      "強大的 AI 雙引擎。無論是程式碼除錯、文案生成還是複雜資料分析，讓單兵作戰的遊牧者也能擁有一整個大腦智庫團隊。",
    url: "https://example.com/tools/ai-pro-claude",
    pricing: null,
    warning: null,
    tags: ["AI", "生產力", "資料分析"],
    is_featured: true,
    created_at: "2026-05-11T08:00:00.000Z"
  },
  {
    id: "tool-003",
    name: "1Password",
    category: "跨國資安與防護",
    description:
      "在海外各地頻繁切換網路與設備時的必備護城河，妥善管理所有高權限帳號密碼，守護異地登入安全。",
    url: "https://example.com/tools/1password",
    pricing: null,
    warning: null,
    tags: ["資安", "密碼管理", "異地登入"],
    is_featured: true,
    created_at: "2026-05-09T08:00:00.000Z"
  },
  {
    id: "tool-004",
    name: "Workation 專屬通票 (Hokkaido)",
    category: "工作環境與差旅",
    description:
      "專為前往北海道 (Niseko / Furano) 等滑雪勝地的遊牧者設計。白天享受粉雪，晚上在附設高速 Wi-Fi 的木屋工作區高效產出。",
    url: "https://example.com/tools/hokkaido-workation",
    pricing: null,
    warning: null,
    tags: ["Workation", "北海道", "差旅"],
    is_featured: true,
    created_at: "2026-05-06T08:00:00.000Z"
  }
];

export const mockTalents: Talent[] = [
  {
    id: "talent-001",
    profile_id: null,
    headline: "Product Designer / Design Systems",
    summary: "擅長 B2B SaaS 產品設計、研究訪談與元件系統維護。",
    portfolio_url: "https://example.com/talents/ivy",
    skills: ["Figma", "UX Research", "Design System"],
    location: "Taipei, Taiwan",
    is_featured: true,
    status: "published",
    created_at: "2026-05-10T08:00:00.000Z",
    updated_at: "2026-05-10T08:00:00.000Z"
  },
  {
    id: "talent-002",
    profile_id: null,
    headline: "Full-stack Engineer / Next.js",
    summary: "熟悉 Next.js、Supabase 與遠端團隊 API 協作流程。",
    portfolio_url: "https://example.com/talents/marcus",
    skills: ["Next.js", "Supabase", "TypeScript"],
    location: "Chiang Mai, Thailand",
    is_featured: true,
    status: "published",
    created_at: "2026-05-08T08:00:00.000Z",
    updated_at: "2026-05-08T08:00:00.000Z"
  },
  {
    id: "talent-003",
    profile_id: null,
    headline: "Content Strategist / SEO",
    summary: "協助遠端品牌建立華語內容策略、newsletter 與搜尋流量。",
    portfolio_url: "https://example.com/talents/nora",
    skills: ["SEO", "B2B Content", "Analytics"],
    location: "Kaohsiung, Taiwan",
    is_featured: false,
    status: "pending",
    created_at: "2026-05-05T08:00:00.000Z",
    updated_at: "2026-05-05T08:00:00.000Z"
  }
];

export const mockSiteSettings: SiteSettings = {
  id: 1,
  hero_title: "NOMAD-GO 遊牧出發",
  hero_subtitle:
    "整合遠端職缺、城市指南、工具清單與人才推薦，幫助華語工作者用更清楚的資訊開始全球移動。",
  hero_image_url:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85",
  announcement_text: "NOMAD-GO beta 開放中，歡迎加入華語數位遊牧社群。",
  announcement_enabled: true,
  updated_at: "2026-05-12T08:00:00.000Z"
};

export const mockTalentProfiles: Profile[] = [
  {
    id: "profile-001",
    role: "user",
    account_type: "nomad",
    full_name: "Ivy Chen",
    title: "資深產品設計師 (B2B SaaS)",
    avatar_url: null,
    bio: "擅長從使用者研究、資訊架構到設計系統落地，協助遠端團隊把複雜流程變成清楚介面。",
    skills: ["Figma", "UX Research", "Design System"],
    location: "Taipei / Remote",
    status: "published",
    is_featured: true,
    is_banned: false,
    timezone: "UTC+8",
    languages: ["中文", "English"],
    work_type: ["專案接案", "兼職"],
    portfolio_url: "https://example.com/ivy",
    social_urls: {
      linkedin: "https://linkedin.com/in/ivy-example"
    },
    work_experience: [],
    education: [],
    sponsored_until: "2026-06-24T15:59:59.000Z",
    stripe_customer_id: null,
    created_at: "2026-05-01T08:00:00.000Z",
    updated_at: "2026-05-20T08:00:00.000Z"
  },
  {
    id: "profile-002",
    role: "user",
    account_type: "nomad",
    full_name: "Marcus Lin",
    title: "全端工程師 / Next.js 架構師",
    avatar_url: null,
    bio: "熟悉 Next.js、Supabase、API 設計與跨時區工程協作，能從 MVP 到 production 建立穩定基礎。",
    skills: ["Next.js", "Supabase", "TypeScript"],
    location: "Chiang Mai",
    status: "published",
    is_featured: false,
    is_banned: false,
    timezone: "UTC+7",
    languages: ["中文", "English"],
    work_type: ["全職遠端", "專案接案"],
    portfolio_url: "https://example.com/marcus",
    social_urls: {
      github: "https://github.com/marcus-example"
    },
    work_experience: [],
    education: [],
    sponsored_until: null,
    stripe_customer_id: null,
    created_at: "2026-05-03T08:00:00.000Z",
    updated_at: "2026-05-18T08:00:00.000Z"
  },
  {
    id: "profile-003",
    role: "user",
    account_type: "nomad",
    full_name: "Nora Wang",
    title: "內容策略顧問 / SEO Growth",
    avatar_url: null,
    bio: "協助 SaaS 與遠端品牌規劃華語內容、SEO、newsletter 與跨市場成長實驗。",
    skills: ["SEO", "B2B Content", "Analytics"],
    location: "Kaohsiung",
    status: "pending",
    is_featured: false,
    is_banned: false,
    timezone: "UTC+8",
    languages: ["中文", "English", "日本語"],
    work_type: ["兼職", "專案接案"],
    portfolio_url: "https://example.com/nora",
    social_urls: {},
    work_experience: [],
    education: [],
    sponsored_until: null,
    stripe_customer_id: null,
    created_at: "2026-05-04T08:00:00.000Z",
    updated_at: "2026-05-16T08:00:00.000Z"
  }
];

export async function getJobs() {
  if (!supabase) {
    return mockJobs.filter((job) => job.status === "published");
  }

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to fetch jobs from Supabase:", error?.message);
    return mockJobs;
  }

  return data;
}

export async function getFeaturedJobs(limit = 3) {
  if (!supabase) {
    return mockJobs
      .filter((job) => job.is_featured && job.status === "published")
      .slice(0, limit);
  }

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("is_featured", true)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch featured jobs from Supabase:", error);
    return mockJobs
      .filter((job) => job.is_featured && job.status === "published")
      .slice(0, limit);
  }

  if (!data) {
    console.error("Failed to fetch featured jobs from Supabase: no data returned");
    return mockJobs
      .filter((job) => job.is_featured && job.status === "published")
      .slice(0, limit);
  }

  if (data.length === 0) {
    return mockJobs
      .filter((job) => job.is_featured && job.status === "published")
      .slice(0, limit);
  }

  return data;
}

export async function getGuides() {
  if (!supabase) {
    return mockGuides;
  }

  const { data, error } = await supabase
    .from("guides")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to fetch guides from Supabase:", error?.message);
    return mockGuides;
  }

  return data;
}

export async function getTalents() {
  if (!supabase) {
    return mockTalents;
  }

  const { data, error } = await supabase
    .from("talents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to fetch talents from Supabase:", error?.message);
    return mockTalents;
  }

  return data;
}

export async function getTalentProfiles() {
  const sortProfiles = (profiles: Profile[]) =>
    [...profiles].sort((left, right) => {
      const now = Date.now();
      const leftVip = left.sponsored_until
        ? new Date(left.sponsored_until).getTime() > now
        : false;
      const rightVip = right.sponsored_until
        ? new Date(right.sponsored_until).getTime() > now
        : false;

      if (leftVip !== rightVip) {
        return leftVip ? -1 : 1;
      }

      if (leftVip && rightVip) {
        return (
          new Date(right.sponsored_until ?? 0).getTime() -
          new Date(left.sponsored_until ?? 0).getTime()
        );
      }

      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    });

  if (!supabase) {
    return sortProfiles(mockTalentProfiles.filter((profile) => profile.status === "published"));
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("account_type", "nomad")
    .eq("status", "published")
    .order("sponsored_until", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to fetch talent profiles from Supabase:", error?.message);
    return sortProfiles(mockTalentProfiles);
  }

  return sortProfiles(data);
}

export async function getSiteSettings() {
  if (!supabase) {
    return mockSiteSettings;
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    console.error("Failed to fetch site settings from Supabase:", error?.message);
    return mockSiteSettings;
  }

  return {
    ...mockSiteSettings,
    ...data,
    id: Number(data.id ?? 1)
  };
}

export async function getTools() {
  if (!supabase) {
    return mockTools;
  }

  const { data, error } = await supabase
    .from("tools")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to fetch tools from Supabase:", error?.message);
    return mockTools;
  }

  if (data.length === 0) {
    return mockTools;
  }

  return data;
}

export function filterJobs(
  jobs: Job[],
  filters: {
    query?: string;
    type?: string;
    location?: string;
  }
) {
  const query = filters.query?.trim().toLowerCase();
  const type = filters.type?.trim();
  const location = filters.location?.trim().toLowerCase();

  return jobs.filter((job) => {
    const matchesQuery = query
      ? [job.title, job.company, job.description, ...job.tags]
          .join(" ")
          .toLowerCase()
          .includes(query)
      : true;
    const matchesType = type ? job.job_type === type : true;
    const matchesLocation = location
      ? job.location.toLowerCase().includes(location)
      : true;

    return matchesQuery && matchesType && matchesLocation;
  });
}

export function groupToolsByCategory(tools: Tool[]) {
  return tools.reduce<Record<string, Tool[]>>((groups, tool) => {
    groups[tool.category] = groups[tool.category] ?? [];
    groups[tool.category].push(tool);
    return groups;
  }, {});
}
