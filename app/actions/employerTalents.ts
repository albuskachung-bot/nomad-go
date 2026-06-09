"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getEmployerWorkspaceContext,
  getWorkspaceErrorMessage,
  isWorkspaceSchemaMissingError
} from "@/lib/employer-workspace";
import type { Profile } from "@/lib/types";

export type PublicTalent = {
  id: string;
  name: string;
  title: string;
  skills: string[];
  timezone: string | null;
  avatarUrl: string | null;
};

export type PublicTalentsResult = {
  talents: PublicTalent[];
  error: string | null;
};

export type TriggerProfileViewResult = {
  ok: boolean;
  error: string | null;
};

function toPublicTalent(profile: Profile): PublicTalent {
  return {
    id: profile.id,
    name: profile.full_name?.trim() || `Nomad ${profile.id.slice(0, 6)}`,
    title: profile.job_title?.trim() || profile.title?.trim() || "數位遊牧人才",
    skills: profile.skills ?? [],
    timezone: profile.timezone,
    avatarUrl: profile.avatar_url
  };
}

function isMissingColumnError(error: unknown, columnName: string) {
  const message = getWorkspaceErrorMessage(error).toLowerCase();
  return (
    isWorkspaceSchemaMissingError(error) &&
    message.includes(columnName.toLowerCase()) &&
    message.includes("column")
  );
}

export async function getPublicTalents(): Promise<PublicTalentsResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      talents: [],
      error: "尚未設定 Supabase 環境變數，無法讀取人才資料。"
    };
  }

  const publicProfilesResult = await supabase
    .from("profiles")
    .select("id, full_name, title, job_title, skills, timezone, avatar_url")
    .eq("is_public", true)
    .neq("account_type", "employer")
    .order("created_at", { ascending: false });

  if (!publicProfilesResult.error) {
    return {
      talents: ((publicProfilesResult.data ?? []) as Profile[]).map(toPublicTalent),
      error: null
    };
  }

  if (!isMissingColumnError(publicProfilesResult.error, "is_public")) {
    return {
      talents: [],
      error: getWorkspaceErrorMessage(publicProfilesResult.error)
    };
  }

  const fallbackProfilesResult = await supabase
    .from("profiles")
    .select("id, full_name, title, job_title, skills, timezone, avatar_url")
    .not("job_title", "is", null)
    .neq("account_type", "employer")
    .order("created_at", { ascending: false });

  if (fallbackProfilesResult.error) {
    return {
      talents: [],
      error: getWorkspaceErrorMessage(fallbackProfilesResult.error)
    };
  }

  return {
    talents: ((fallbackProfilesResult.data ?? []) as Profile[]).map(toPublicTalent),
    error: null
  };
}

export async function triggerProfileView(
  targetUserId: string,
  companyId: string,
  companyName: string
): Promise<TriggerProfileViewResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      error: "尚未設定 Supabase 環境變數，無法紀錄履歷瀏覽。"
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "請先登入企業雇主中心。"
    };
  }

  const workspace = await getEmployerWorkspaceContext(supabase, user.id);

  if (workspace.error) {
    return {
      ok: false,
      error: workspace.error
    };
  }

  if (!workspace.context || workspace.context.company.id !== companyId) {
    return {
      ok: false,
      error: "你沒有權限以此公司紀錄履歷瀏覽。"
    };
  }

  const { error } = await supabase.from("profile_views").insert({
    viewer_company_id: companyId,
    viewer_company_name: companyName,
    target_user_id: targetUserId
  });

  if (error) {
    return {
      ok: false,
      error: getWorkspaceErrorMessage(error)
    };
  }

  return {
    ok: true,
    error: null
  };
}
