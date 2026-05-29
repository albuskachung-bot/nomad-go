import type { SupabaseClient } from "@supabase/supabase-js";
import type { Company, CompanyMember, CompanyMemberRole, Database } from "@/lib/types";

type AppSupabaseClient = SupabaseClient<Database>;

export type EmployerWorkspaceContext = {
  company: Company;
  membershipRole: CompanyMemberRole;
  isOwner: boolean;
  canManageCompany: boolean;
  canManageTeam: boolean;
};

export type EmployerWorkspaceResult = {
  context: EmployerWorkspaceContext | null;
  error: string | null;
  isSchemaMissing: boolean;
};

export function getWorkspaceErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return "發生未知錯誤，請稍後再試。";
}

function getWorkspaceErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }

  return null;
}

export function isWorkspaceSchemaMissingError(error: unknown) {
  const code = getWorkspaceErrorCode(error);
  const message = getWorkspaceErrorMessage(error).toLowerCase();

  return (
    code === "PGRST116" ||
    code === "PGRST202" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    code === "42P01" ||
    code === "42703" ||
    message.includes("could not find the table") ||
    (message.includes("column") && message.includes("does not exist")) ||
    (message.includes("function") && message.includes("does not exist")) ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

export async function getEmployerWorkspaceContext(
  supabase: AppSupabaseClient,
  userId: string
): Promise<EmployerWorkspaceResult> {
  const { data: ownedCompany, error: ownedError } = await supabase
    .from("companies")
    .select("*")
    .eq("employer_id", userId)
    .limit(1)
    .maybeSingle();

  if (ownedError) {
    return {
      context: null,
      error: getWorkspaceErrorMessage(ownedError),
      isSchemaMissing: isWorkspaceSchemaMissingError(ownedError)
    };
  }

  if (ownedCompany) {
    return {
      context: {
        company: ownedCompany as Company,
        membershipRole: "admin",
        isOwner: true,
        canManageCompany: true,
        canManageTeam: true
      },
      error: null,
      isSchemaMissing: false
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("company_members")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return {
      context: null,
      error: isWorkspaceSchemaMissingError(membershipError)
        ? "尚未建立 B2B Workspace 資料表，請先執行 supabase/company-workspaces.sql。"
        : getWorkspaceErrorMessage(membershipError),
      isSchemaMissing: isWorkspaceSchemaMissingError(membershipError)
    };
  }

  if (!membership) {
    return {
      context: null,
      error: null,
      isSchemaMissing: false
    };
  }

  const typedMembership = membership as CompanyMember;
  const { data: memberCompany, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", typedMembership.company_id)
    .maybeSingle();

  if (companyError) {
    return {
      context: null,
      error: getWorkspaceErrorMessage(companyError),
      isSchemaMissing: isWorkspaceSchemaMissingError(companyError)
    };
  }

  if (!memberCompany) {
    return {
      context: null,
      error: "此成員已加入團隊，但找不到對應公司資料。",
      isSchemaMissing: false
    };
  }

  const role = typedMembership.role;

  return {
    context: {
      company: memberCompany as Company,
      membershipRole: role,
      isOwner: false,
      canManageCompany: role === "admin",
      canManageTeam: role === "admin"
    },
    error: null,
    isSchemaMissing: false
  };
}
