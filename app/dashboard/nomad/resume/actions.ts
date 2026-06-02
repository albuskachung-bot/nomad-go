"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Database,
  ProfileEducation,
  ProfileWorkExperience
} from "@/lib/types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type NomadProfilePayload = {
  full_name: string;
  job_title: string;
  avatar_url: string;
  banner_url: string;
  location: string;
  timezone: string;
  skills: string[];
  languages: string[];
  work_type: string[];
  bio: string;
  portfolio_url: string;
  linkedin_url: string;
  github_url: string;
  work_experience: ProfileWorkExperience[];
  education: ProfileEducation[];
  is_public: boolean;
};

type ActionResult = {
  ok: boolean;
  message: string;
};

function normalizeOptional(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return text.length > 0 ? text : null;
}

function normalizeList(values: string[] | null | undefined) {
  return (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeWorkExperience(items: ProfileWorkExperience[] | null | undefined) {
  return (items ?? [])
    .map((item) => ({
      company: item.company.trim(),
      job_title: item.job_title.trim(),
      start_date: item.start_date.trim(),
      end_date: normalizeOptional(item.end_date),
      description: item.description.trim()
    }))
    .filter((item) =>
      Boolean(item.company || item.job_title || item.start_date || item.end_date || item.description)
    );
}

function normalizeEducation(items: ProfileEducation[] | null | undefined) {
  return (items ?? [])
    .map((item) => ({
      school: item.school.trim(),
      degree: item.degree.trim(),
      graduation_year: item.graduation_year.trim()
    }))
    .filter((item) => Boolean(item.school || item.degree || item.graduation_year));
}

export async function saveNomadProfile(
  payload: NomadProfilePayload
): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return {
        ok: false,
        message: "尚未設定 Supabase 環境變數，無法儲存履歷。"
      };
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        message: "請先登入後再儲存履歷。"
      };
    }

    const jobTitle = normalizeOptional(payload.job_title);
    const socialUrls: Record<string, string> = {};

    if (payload.linkedin_url.trim()) {
      socialUrls.linkedin = payload.linkedin_url.trim();
    }

    if (payload.github_url.trim()) {
      socialUrls.github = payload.github_url.trim();
    }

    const updatePayload: ProfileUpdate = {
      full_name: normalizeOptional(payload.full_name),
      title: jobTitle,
      job_title: jobTitle,
      avatar_url: normalizeOptional(payload.avatar_url),
      banner_url: normalizeOptional(payload.banner_url),
      location: normalizeOptional(payload.location),
      timezone: normalizeOptional(payload.timezone),
      skills: normalizeList(payload.skills),
      languages: normalizeList(payload.languages),
      work_type: normalizeList(payload.work_type),
      bio: normalizeOptional(payload.bio),
      portfolio_url: normalizeOptional(payload.portfolio_url),
      social_urls: socialUrls,
      work_experience: normalizeWorkExperience(payload.work_experience),
      education: normalizeEducation(payload.education),
      is_public: Boolean(payload.is_public)
    };

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id);

    if (error) {
      return {
        ok: false,
        message: error.message
      };
    }

    revalidatePath("/dashboard/nomad/resume");
    revalidatePath("/talent");

    return {
      ok: true,
      message: "履歷資料已成功儲存！"
    };
  } catch (error) {
    console.error("[nomad-resume] Failed to save profile.", error);

    return {
      ok: false,
      message: "履歷儲存失敗，請稍後再試。"
    };
  }
}
