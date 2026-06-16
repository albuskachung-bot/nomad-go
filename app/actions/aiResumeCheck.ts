"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, ProfileEducation, ProfileWorkExperience } from "@/lib/types";

type AnalyzeResumeResult =
  | {
      success: true;
      report: string;
    }
  | {
      success: false;
      error: string;
    };

type ResumeProfile = Pick<
  Profile,
  | "id"
  | "full_name"
  | "title"
  | "job_title"
  | "bio"
  | "skills"
  | "location"
  | "timezone"
  | "languages"
  | "work_type"
  | "portfolio_url"
  | "work_experience"
  | "education"
>;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function normalizeStringList(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.map((item) => item.trim()).filter(Boolean) : [];
}

function normalizeWorkExperience(value: unknown): ProfileWorkExperience[] {
  return Array.isArray(value)
    ? value.filter((item): item is ProfileWorkExperience => {
        if (!item || typeof item !== "object") {
          return false;
        }

        const record = item as Partial<ProfileWorkExperience>;
        return Boolean(
          record.company?.trim() ||
            record.job_title?.trim() ||
            record.description?.trim()
        );
      })
    : [];
}

function normalizeEducation(value: unknown): ProfileEducation[] {
  return Array.isArray(value)
    ? value.filter((item): item is ProfileEducation => {
        if (!item || typeof item !== "object") {
          return false;
        }

        const record = item as Partial<ProfileEducation>;
        return Boolean(record.school?.trim() || record.degree?.trim());
      })
    : [];
}

function isResumeBlank(profile: ResumeProfile) {
  return (
    !hasText(profile.full_name) &&
    !hasText(profile.job_title) &&
    !hasText(profile.title) &&
    !hasText(profile.bio) &&
    normalizeStringList(profile.skills).length === 0 &&
    normalizeWorkExperience(profile.work_experience).length === 0 &&
    normalizeEducation(profile.education).length === 0
  );
}

function buildMockResumeReport(profile: ResumeProfile) {
  const jobTitle = profile.job_title?.trim() || profile.title?.trim() || "未設定職稱";
  const skills = normalizeStringList(profile.skills);
  const workExperience = normalizeWorkExperience(profile.work_experience);
  const education = normalizeEducation(profile.education);
  const displaySkills = skills.length > 0 ? skills.slice(0, 5).join("、") : "尚未填寫技能";
  const hasPortfolio = hasText(profile.portfolio_url);

  return [
    `AI 履歷健檢報告`,
    ``,
    `目標定位：${jobTitle}`,
    `核心技能：${displaySkills}`,
    ``,
    `一、優點`,
    `- 你的履歷已經具備「${jobTitle}」的基本定位，適合用在遠端職缺與企業主動邀約情境。`,
    skills.length >= 3
      ? `- 技能標籤涵蓋 ${skills.slice(0, 3).join("、")}，能讓雇主快速判斷你的專長。`
      : `- 已有初步技能資訊，但仍建議補足 3-5 個最能代表你的關鍵技能。`,
    workExperience.length > 0
      ? `- 已填寫 ${workExperience.length} 段工作經歷，履歷可信度比單純自我描述更高。`
      : `- 目前尚未看到完整工作經歷，若補上代表專案會更有說服力。`,
    ``,
    `二、待改進之處`,
    !hasText(profile.bio)
      ? `- 建議補上 3-5 句個人摘要，說明你擅長解決什麼問題、偏好的合作模式與遠端協作方式。`
      : `- 個人摘要可以再更具體，建議加入可量化成果，例如轉換率、營收、交付週期或團隊規模。`,
    skills.length < 5
      ? `- 技能標籤偏少，建議補齊工具、框架、語言能力與產業經驗。`
      : `- 技能數量足夠，下一步可把最重要的 3 個技能放到摘要與經歷描述中重複強化。`,
    !hasPortfolio
      ? `- 尚未填寫作品集連結。遠端職缺很重視可驗證成果，建議加入作品集、GitHub、案例頁或簡報。`
      : `- 已有作品集連結，建議確認首頁能在 10 秒內看懂你的代表作品與角色貢獻。`,
    ``,
    `三、排版建議`,
    `- 第一屏建議依序呈現：職稱、一句定位、3-5 個核心技能、目前所在時區。`,
    `- 工作經歷每段用「任務、行動、成果」三行呈現，避免只列職責。`,
    education.length > 0
      ? `- 教育背景已填寫，可放在經歷與作品集之後，避免搶走重點。`
      : `- 若教育背景與目標職位相關，可補上學校、學位或進修課程；不相關則可精簡。`,
    ``,
    `四、下一步`,
    `- 優先補強個人摘要與作品集，再更新 1-2 段最能代表「${jobTitle}」能力的工作經歷。`
  ].join("\n");
}

export async function analyzeResume(userId: string): Promise<AnalyzeResumeResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      success: false,
      error: "尚未設定 Supabase 環境變數，無法進行 AI 履歷健檢。"
    };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: "請先登入後再使用 AI 履歷健檢。"
    };
  }

  if (user.id !== userId) {
    return {
      success: false,
      error: "無權限健檢其他使用者的履歷。"
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, title, job_title, bio, skills, location, timezone, languages, work_type, portfolio_url, work_experience, education"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[ai-resume-check] Failed to load profile.", error);

    return {
      success: false,
      error: "履歷資料暫時無法讀取，請稍後再試。"
    };
  }

  if (!profile || isResumeBlank(profile as ResumeProfile)) {
    return {
      success: false,
      error: "請先填寫基本履歷資料，AI 才有辦法幫您健檢喔！"
    };
  }

  await delay(2000);

  return {
    success: true,
    report: buildMockResumeReport(profile as ResumeProfile)
  };
}
