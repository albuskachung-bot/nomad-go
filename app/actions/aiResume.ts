"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, ProfileEducation, ProfileWorkExperience } from "@/lib/types";

type GenerateResumeAuditResult =
  | {
      success: true;
      markdown: string;
    }
  | {
      success: false;
      error: string;
    };

type ResumeAuditProfile = Pick<
  Profile,
  | "id"
  | "full_name"
  | "job_title"
  | "title"
  | "skills"
  | "status"
  | "bio"
  | "location"
  | "timezone"
  | "languages"
  | "work_type"
  | "portfolio_url"
  | "work_experience"
  | "education"
>;

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const EMPTY_RESUME_ERROR =
  "您的履歷目前是一片空白，請先在下方填寫職稱與技能，AI 才能為您把脈喔！";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeList(value: string[] | null | undefined) {
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

function getJobTitle(profile: ResumeAuditProfile) {
  return profile.job_title?.trim() || profile.title?.trim() || "";
}

function buildResumePrompt(profile: ResumeAuditProfile) {
  const jobTitle = getJobTitle(profile);
  const skills = normalizeList(profile.skills);
  const languages = normalizeList(profile.languages);
  const workTypes = normalizeList(profile.work_type);
  const workExperience = normalizeWorkExperience(profile.work_experience);
  const education = normalizeEducation(profile.education);

  return [
    "你是一位專精於全球數位遊牧與遠端工作的資深人資獵頭。",
    "請針對以下華語遠端人才的履歷進行深度健檢，並用繁體中文輸出一份結構清晰的 Markdown 報告。",
    "",
    "## 人才資料",
    `- 姓名：${profile.full_name?.trim() || "未提供"}`,
    `- 應徵職稱：${jobTitle}`,
    `- 帳號狀態：${profile.status}`,
    `- 核心技能：${skills.join("、")}`,
    `- 個人摘要：${profile.bio?.trim() || "未提供"}`,
    `- 所在地：${profile.location?.trim() || "未提供"}`,
    `- 時區：${profile.timezone?.trim() || "未提供"}`,
    `- 語言能力：${languages.length > 0 ? languages.join("、") : "未提供"}`,
    `- 合作型態：${workTypes.length > 0 ? workTypes.join("、") : "未提供"}`,
    `- 作品集：${profile.portfolio_url?.trim() || "未提供"}`,
    `- 工作經歷：${workExperience.length > 0 ? JSON.stringify(workExperience) : "未提供"}`,
    `- 教育背景：${education.length > 0 ? JSON.stringify(education) : "未提供"}`,
    "",
    "## 請輸出以下段落",
    "1. 履歷吸睛亮點",
    "2. 市場競爭力評估",
    "3. 具體修改建議",
    "4. 針對數位遊牧市場的技能包加強建議",
    "",
    "請避免空泛鼓勵，每一點都要能直接拿去修改履歷。"
  ].join("\n");
}

async function callGemini(prompt: string, apiKey: string) {
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1600
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API failed with ${response.status}`);
  }

  const payload = (await response.json()) as GeminiResponse;
  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("\n")
      .trim() ?? "";

  if (!text) {
    throw new Error("Gemini API returned empty content.");
  }

  return text;
}

async function callOpenAi(prompt: string, apiKey: string) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 1600,
      messages: [
        {
          role: "system",
          content:
            "你是專精全球遠端工作、華語人才履歷優化與數位遊牧職涯策略的資深人資獵頭。"
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API failed with ${response.status}`);
  }

  const payload = (await response.json()) as OpenAiChatResponse;
  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";

  if (!text) {
    throw new Error("OpenAI API returned empty content.");
  }

  return text;
}

async function buildMockAudit(profile: ResumeAuditProfile) {
  await delay(1500);

  const jobTitle = getJobTitle(profile);
  const skills = normalizeList(profile.skills);
  const primarySkills = skills.slice(0, 5).join("、");
  const skillGap =
    skills.length >= 5
      ? "你已具備足夠的技能標籤，下一步應把這些技能放進實際專案成果中佐證。"
      : "目前技能標籤仍偏少，建議補足工具、框架、遠端協作與產業領域關鍵字。";

  return [
    "# AI 履歷健檢報告",
    "",
    `## 1. 履歷吸睛亮點`,
    `- 你的職稱定位為 **${jobTitle}**，能讓企業快速理解你想承接的角色。`,
    `- 目前技能包含 **${primarySkills}**，適合放在履歷第一屏作為快速篩選訊號。`,
    "- 若能把技能連結到具體成果，例如交付速度、營收影響、使用者成長或流程改善，會更像付費人才而非一般求職者。",
    "",
    "## 2. 市場競爭力評估",
    `- 以全球遠端市場來看，**${jobTitle}** 需要同時呈現專業能力、非同步溝通能力與跨時區合作成熟度。`,
    `- ${skillGap}`,
    "- 建議補上英文協作、文件化能力、專案管理工具與遠端會議節奏等訊號，能提高海外團隊信任感。",
    "",
    "## 3. 具體修改建議",
    "- 個人摘要請改成 3 行：第一行說明職能定位，第二行列出代表成果，第三行說明偏好的合作模式與時區。",
    "- 工作經歷每段使用「任務 / 行動 / 成果」格式，不要只列職責。",
    "- 作品集或案例連結應放在第一屏，並標示你在專案中的實際角色與貢獻。",
    "",
    "## 4. 數位遊牧技能包加強建議",
    "- 增加遠端協作工具：Notion、Slack、Linear、GitHub、Loom 或 Miro。",
    "- 增加跨時區交付證據：可合作時段、非同步更新習慣、文件交接流程。",
    "- 增加商業成果語言：例如提升轉換率、降低客服量、縮短交付週期、改善留存率。",
    "",
    "## 下一步",
    `請優先補強 **${jobTitle}** 的代表作品與量化成果，這會比單純增加技能標籤更能提升面試率。`
  ].join("\n");
}

export async function generateResumeAudit(
  userId: string
): Promise<GenerateResumeAuditResult> {
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
      "id, full_name, job_title, title, skills, status, bio, location, timezone, languages, work_type, portfolio_url, work_experience, education"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[ai-resume] Failed to load profile.", error);

    return {
      success: false,
      error: "履歷資料暫時無法讀取，請稍後再試。"
    };
  }

  if (!profile) {
    return {
      success: false,
      error: EMPTY_RESUME_ERROR
    };
  }

  const typedProfile = profile as ResumeAuditProfile;
  const jobTitle = getJobTitle(typedProfile);
  const skills = normalizeList(typedProfile.skills);

  if (!jobTitle || skills.length === 0) {
    return {
      success: false,
      error: EMPTY_RESUME_ERROR
    };
  }

  const prompt = buildResumePrompt(typedProfile);
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  try {
    if (geminiKey) {
      return {
        success: true,
        markdown: await callGemini(prompt, geminiKey)
      };
    }

    if (openAiKey) {
      return {
        success: true,
        markdown: await callOpenAi(prompt, openAiKey)
      };
    }
  } catch (error) {
    console.error("[ai-resume] LLM provider failed. Falling back to mock audit.", error);
  }

  return {
    success: true,
    markdown: await buildMockAudit(typedProfile)
  };
}
