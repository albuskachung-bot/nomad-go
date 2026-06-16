"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { isAdminRole, type AdminRole } from "@/lib/admin-auth";
import { getCurrentAdminContext } from "@/lib/admin";
import { platformApiSettingKeys } from "@/lib/platform-settings";
import { createResendClient, getEmailFrom } from "@/lib/resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CompanyApprovalStatus,
  CompanySubscriptionPlan,
  ContentStatus,
  Database,
  JobStatus,
  ProfileRole,
  TalentSubscriptionPlan
} from "@/lib/types";

type CurationTable = "jobs" | "guides" | "talents" | "profiles";
type UserManagementRole = ProfileRole;
type ActionResult = {
  ok: boolean;
  message: string;
};

const curationTables: CurationTable[] = ["jobs", "guides", "talents", "profiles"];
const statuses: ContentStatus[] = ["pending", "published", "rejected"];
const jobStatuses: JobStatus[] = ["draft", "pending", "reviewed", "published", "closed", "rejected"];
const companyApprovalStatuses: CompanyApprovalStatus[] = ["pending", "approved", "rejected"];
const companySubscriptionPlans: CompanySubscriptionPlan[] = ["free", "pro", "boost"];
const talentSubscriptionPlans: TalentSubscriptionPlan[] = ["free", "pro", "vip"];
const userManagementRoles: UserManagementRole[] = [
  "member",
  "reviewer",
  "editor",
  "super_admin"
];

function isUserManagementRole(role: string | undefined): role is UserManagementRole {
  return Boolean(role && userManagementRoles.includes(role as UserManagementRole));
}

function isAssignableAdminRole(role: string | undefined): role is AdminRole {
  return isAdminRole(role as ProfileRole);
}

function isCompanyApprovalStatus(status: string | undefined): status is CompanyApprovalStatus {
  return Boolean(status && companyApprovalStatuses.includes(status as CompanyApprovalStatus));
}

function isCompanySubscriptionPlan(
  plan: string | undefined
): plan is CompanySubscriptionPlan {
  return Boolean(plan && companySubscriptionPlans.includes(plan as CompanySubscriptionPlan));
}

function isTalentSubscriptionPlan(
  plan: string | undefined
): plan is TalentSubscriptionPlan {
  return Boolean(plan && talentSubscriptionPlans.includes(plan as TalentSubscriptionPlan));
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getAdminInviteRedirectTo() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (!siteUrl) {
    return undefined;
  }

  return `${siteUrl.replace(/\/$/, "")}/auth/callback?next=/admin`;
}

async function requireAdmin() {
  const context = await getCurrentAdminContext();

  if (!context.supabase || !context.isAdmin) {
    throw new Error("Unauthorized admin action");
  }

  return context;
}

async function requireSuperAdmin() {
  const context = await requireAdmin();

  if (!context.isSuperAdmin) {
    throw new Error("Only super_admin can manage users");
  }

  return context;
}

export async function updateCurationItem(formData: FormData) {
  await updateAdminContentItem(formData);
}

export async function updateCompanyApprovalStatus(formData: FormData): Promise<ActionResult> {
  const context = await requireAdmin();
  const companyId = formData.get("company_id")?.toString();
  const nextStatus = formData.get("approval_status")?.toString();

  if (!companyId || !isCompanyApprovalStatus(nextStatus)) {
    return {
      ok: false,
      message: "企業審核資料不完整。"
    };
  }

  const { error } = await context.supabase
    .from("companies")
    .update({ approval_status: nextStatus })
    .eq("id", companyId);

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  revalidatePath("/admin/employers");
  revalidatePath(`/admin/employers/${companyId}`);
  revalidatePath("/employer/dashboard");

  return {
    ok: true,
    message:
      nextStatus === "approved"
        ? "企業已核准。"
        : nextStatus === "rejected"
          ? "企業已婉拒。"
          : "企業審核狀態已更新。"
  };
}

export async function updateCompanySubscriptionPlan(formData: FormData): Promise<ActionResult> {
  const context = await requireSuperAdmin();
  const companyId = formData.get("company_id")?.toString();
  const nextPlan = formData.get("subscription_plan")?.toString();

  if (!companyId || !isCompanySubscriptionPlan(nextPlan)) {
    return {
      ok: false,
      message: "企業方案資料不完整。"
    };
  }

  const { error } = await context.supabase
    .from("companies")
    .update({ subscription_plan: nextPlan })
    .eq("id", companyId);

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  revalidatePath("/admin/companies");
  revalidatePath(`/admin/companies/${companyId}`);
  revalidatePath("/employer/billing");

  return {
    ok: true,
    message: "企業方案已更新。"
  };
}

export async function updateTalentSubscriptionPlan(formData: FormData): Promise<ActionResult> {
  const context = await requireSuperAdmin();
  const profileId = formData.get("profile_id")?.toString();
  const nextPlan = formData.get("subscription_plan")?.toString();

  if (!profileId || !isTalentSubscriptionPlan(nextPlan)) {
    return {
      ok: false,
      message: "人才方案資料不完整。"
    };
  }

  const updatePayload: Database["public"]["Tables"]["profiles"]["Update"] = {
    subscription_plan: nextPlan
  };

  if (nextPlan === "free") {
    updatePayload.plan_expires_at = null;
  }

  const { error } = await context.supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", profileId);

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  revalidatePath("/admin/talents");
  revalidatePath("/dashboard/nomad/billing");
  revalidatePath(`/talents/${profileId}`);
  revalidatePath("/talents");

  return {
    ok: true,
    message: "人才方案已更新。"
  };
}

export async function updateAdminContentItem(formData: FormData) {
  const context = await requireAdmin();
  const { supabase, profile } = context;
  const table = formData.get("table")?.toString() as CurationTable;
  const id = formData.get("id")?.toString();
  const nextFeatured = formData.get("next_featured")?.toString();
  const nextStatus = formData.get("next_status")?.toString();

  if (!curationTables.includes(table) || !id) {
    throw new Error("Invalid curation payload");
  }

  if (profile?.role === "reviewer" && table !== "jobs" && table !== "profiles") {
    return {
      ok: false,
      message: "Reviewer 只能審核職缺與企業/會員資料。"
    };
  }

  const jobUpdate: Database["public"]["Tables"]["jobs"]["Update"] = {};
  const contentUpdate: {
    is_featured?: boolean;
    status?: ContentStatus;
  } = {};

  if (nextFeatured === "true" || nextFeatured === "false") {
    jobUpdate.is_featured = nextFeatured === "true";
    contentUpdate.is_featured = nextFeatured === "true";
  }

  if (table === "jobs" && nextStatus && jobStatuses.includes(nextStatus as JobStatus)) {
    jobUpdate.status = nextStatus as JobStatus;
  } else if (nextStatus && statuses.includes(nextStatus as ContentStatus)) {
    contentUpdate.status = nextStatus as ContentStatus;
  }

  const update = table === "jobs" ? jobUpdate : contentUpdate;

  if (Object.keys(update).length === 0) {
    return {
      ok: false,
      message: "沒有可更新的欄位。"
    };
  }

  let errorMessage: string | null = null;

  if (table === "jobs") {
    const { error } = await supabase.from("jobs").update(jobUpdate).eq("id", id);
    errorMessage = error?.message ?? null;
  }

  if (table === "guides") {
    const { error } = await supabase.from("guides").update(contentUpdate).eq("id", id);
    errorMessage = error?.message ?? null;
  }

  if (table === "talents") {
    const { error } = await supabase.from("talents").update(contentUpdate).eq("id", id);
    errorMessage = error?.message ?? null;
  }

  if (table === "profiles") {
    const { error } = await supabase.from("profiles").update(contentUpdate).eq("id", id);
    errorMessage = error?.message ?? null;
  }

  if (errorMessage) {
    return {
      ok: false,
      message: errorMessage
    };
  }

  revalidatePath("/admin/curation");
  revalidatePath("/admin/jobs");
  if (table === "jobs") {
    revalidatePath(`/admin/jobs/${id}`);
  }
  revalidatePath("/admin/talent");
  revalidatePath("/");

  return {
    ok: true,
    message: "已更新。"
  };
}

export async function reviewJobAction(jobId: string): Promise<ActionResult> {
  const context = await requireAdmin();

  if (!jobId) {
    return {
      ok: false,
      message: "缺少職缺 ID。"
    };
  }

  const { data: job, error: jobError } = await context.supabase
    .from("jobs")
    .select("id,title,company,company_name,employer_id,company_id,status")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    return {
      ok: false,
      message: jobError.message
    };
  }

  if (!job) {
    return {
      ok: false,
      message: "找不到職缺。"
    };
  }

  let ownerId = job.employer_id;
  let companyName = job.company_name ?? job.company ?? "企業雇主";

  if (job.company_id) {
    const { data: company, error: companyError } = await context.supabase
      .from("companies")
      .select("name,employer_id")
      .eq("id", job.company_id)
      .maybeSingle();

    if (companyError) {
      return {
        ok: false,
        message: companyError.message
      };
    }

    ownerId = company?.employer_id ?? ownerId;
    companyName = company?.name ?? companyName;
  }

  const { error } = await context.supabase
    .from("jobs")
    .update({ status: "reviewed" })
    .eq("id", jobId);

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  if (ownerId) {
    await context.supabase.from("notifications").insert({
      user_id: ownerId,
      type: "job_reviewed",
      title: "職缺已完成 AI 審核",
      message: `「${job.title}」已完成 AI 初步審核，等待營運團隊核准上架。`,
      link_url: `/employer/jobs/${jobId}/edit`,
      metadata: {
        company_name: companyName,
        job_id: jobId,
        job_title: job.title,
        status: "reviewed"
      }
    });

    const resend = createResendClient();
    const supabaseAdmin = createSupabaseAdminClient();

    if (resend && supabaseAdmin) {
      const {
        data: { user }
      } = await supabaseAdmin.auth.admin.getUserById(ownerId);

      if (user?.email) {
        try {
          await resend.emails.send({
            from: getEmailFrom(),
            to: user.email,
            subject: "NOMAD-GO 職缺已完成 AI 初步審核",
            html: `
              <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.7;">
                <h1 style="font-size: 20px;">職缺已完成 AI 初步審核</h1>
                <p>${companyName} 的 <strong>${job.title}</strong> 已完成 AI 初步審核。</p>
                <p>營運團隊將接續進行人工核准，核准後職缺會公開上架。</p>
              </div>
            `
          });
        } catch (emailError) {
          console.error("[admin/jobs] Failed to send job reviewed email.", emailError);
        }
      }
    }
  }

  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath("/employer/jobs");
  revalidatePath("/employer/dashboard");

  return {
    ok: true,
    message: "AI 審核已完成，職缺狀態已更新為 reviewed。"
  };
}

export async function updateFooterSettings(formData: FormData): Promise<ActionResult> {
  const context = await requireSuperAdmin();
  const footerDescription = formData.get("footer_description")?.toString().trim();
  const contactEmail = formData.get("contact_email")?.toString().trim().toLowerCase();
  const socialLinks = {
    instagram: formData.get("social_instagram")?.toString().trim() ?? "",
    threads: formData.get("social_threads")?.toString().trim() ?? "",
    linkedin: formData.get("social_linkedin")?.toString().trim() ?? "",
    facebook: formData.get("social_facebook")?.toString().trim() ?? ""
  };

  if (!footerDescription || !contactEmail || !isValidEmail(contactEmail)) {
    return {
      ok: false,
      message: "請填寫 Footer 文案與有效的聯絡信箱。"
    };
  }

  const { error } = await context.supabase
    .from("site_settings")
    .update({
      footer_description: footerDescription,
      contact_email: contactEmail,
      social_links: socialLinks
    })
    .eq("id", 1);

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  revalidateTag("site-settings");

  return {
    ok: true,
    message: "Footer 設定已更新。"
  };
}

export async function updateAdminRoleByEmail(formData: FormData) {
  return promoteTeamMemberByEmail(formData);
}

export async function updatePlatformApiSettings(formData: FormData): Promise<ActionResult> {
  try {
    const context = await requireSuperAdmin();

    const rows = platformApiSettingKeys.map((key) => ({
      key_name: key,
      key_value: formData.get(key)?.toString().trim() ?? ""
    }));

    const { error } = await context.supabase
      .from("platform_settings")
      .upsert(rows, { onConflict: "key_name" });

    if (error) {
      return {
        ok: false,
        message: error.message
      };
    }

    revalidatePath("/admin/billing");

    return {
      ok: true,
      message: "API 設定已更新。"
    };
  } catch (error) {
    console.error("[admin] Failed to update platform API settings.", error);

    return {
      ok: false,
      message: "只有 Super Admin 可以更新金流與發票 API 設定。"
    };
  }
}

export async function updateUserRole(formData: FormData) {
  const context = await requireSuperAdmin();
  const userId = formData.get("user_id")?.toString();
  const role = formData.get("role")?.toString();

  if (!userId || !isUserManagementRole(role)) {
    return {
      ok: false,
      message: "Invalid user role payload."
    };
  }

  const guardResult = await validateRoleChange(context, userId, role);

  if (guardResult) {
    return guardResult;
  }

  const { error } = await context.supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/team");

  return {
    ok: true,
    message: "使用者權限已更新。"
  };
}

export async function setTeamMemberRole(formData: FormData): Promise<ActionResult> {
  const context = await requireSuperAdmin();
  const userId = formData.get("user_id")?.toString();
  const role = formData.get("role")?.toString();

  if (!userId || !isUserManagementRole(role)) {
    return {
      ok: false,
      message: "權限更新資料不完整。"
    };
  }

  const guardResult = await validateRoleChange(context, userId, role);

  if (guardResult) {
    return guardResult;
  }

  const { error } = await context.supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  revalidatePath("/admin/team");
  revalidatePath("/admin/users");

  return {
    ok: true,
    message: role === "member" ? "已移除後台權限。" : "管理員角色已更新。"
  };
}

export async function removeTeamMemberRole(formData: FormData): Promise<ActionResult> {
  formData.set("role", "member");
  return setTeamMemberRole(formData);
}

async function findAuthUserByEmail(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  email: string
): Promise<{ user: User | null; error: string | null }> {
  const normalizedEmail = email.toLowerCase();
  let page = 1;

  while (page <= 50) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000
    });

    if (error) {
      return {
        user: null,
        error: error.message
      };
    }

    const user =
      data.users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail) ?? null;

    if (user) {
      return {
        user,
        error: null
      };
    }

    if (!data.nextPage || data.users.length === 0) {
      break;
    }

    page = data.nextPage;
  }

  return {
    user: null,
    error: null
  };
}

async function upsertAdminProfileRole(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
  role: AdminRole
): Promise<string | null> {
  const profileRolePayload = {
    id: userId,
    role
  } as Database["public"]["Tables"]["profiles"]["Insert"];

  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert(profileRolePayload, { onConflict: "id" });

  return error?.message ?? null;
}

function revalidateTeamManagementPaths() {
  revalidatePath("/admin/team");
  revalidatePath("/admin/users");
  revalidatePath("/admin/user-roles");
}

export async function promoteTeamMemberByEmail(formData: FormData): Promise<ActionResult> {
  await requireSuperAdmin();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const role = formData.get("role")?.toString();

  if (!email || !isValidEmail(email) || !isAssignableAdminRole(role)) {
    return {
      ok: false,
      message: "請輸入有效 Email，並選擇後台角色。"
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();

  if (!supabaseAdmin) {
    return {
      ok: false,
      message: "尚未設定 SUPABASE_SERVICE_ROLE_KEY，無法新增管理員或發送邀請信。"
    };
  }

  const existingUserResult = await findAuthUserByEmail(supabaseAdmin, email);

  if (existingUserResult.error) {
    return {
      ok: false,
      message: existingUserResult.error
    };
  }

  if (existingUserResult.user) {
    const profileError = await upsertAdminProfileRole(
      supabaseAdmin,
      existingUserResult.user.id,
      role
    );

    if (profileError) {
      return {
        ok: false,
        message: profileError
      };
    }

    revalidateTeamManagementPaths();

    return {
      ok: true,
      message: "該使用者已是會員，已直接升級其權限，無需發送邀請信"
    };
  }

  const { data: inviteData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        role
      },
      redirectTo: getAdminInviteRedirectTo()
    });

  if (inviteError) {
    return {
      ok: false,
      message: inviteError.message
    };
  }

  if (!inviteData.user) {
    return {
      ok: false,
      message: "邀請信已送出，但無法取得受邀使用者資料，請稍後重新整理確認。"
    };
  }

  const profileError = await upsertAdminProfileRole(supabaseAdmin, inviteData.user.id, role);

  if (profileError) {
    return {
      ok: false,
      message: profileError
    };
  }

  revalidateTeamManagementPaths();

  return {
    ok: true,
    message: "已發送邀請信給新管理員"
  };
}

export async function updateUserBanStatus(formData: FormData) {
  const context = await requireSuperAdmin();
  const userId = formData.get("user_id")?.toString();
  const isBanned = formData.get("is_banned")?.toString() === "true";

  if (!userId) {
    return {
      ok: false,
      message: "Invalid ban payload."
    };
  }

  if (context.user?.id === userId && isBanned) {
    return {
      ok: false,
      message: "不能停權自己的帳號。"
    };
  }

  const { error } = await context.supabase
    .from("profiles")
    .update({ is_banned: isBanned })
    .eq("id", userId);

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/team");

  return {
    ok: true,
    message: isBanned ? "使用者已停權。" : "使用者已解除停權。"
  };
}

async function validateRoleChange(
  context: Awaited<ReturnType<typeof requireSuperAdmin>>,
  userId: string,
  nextRole: UserManagementRole
): Promise<ActionResult | null> {
  const { data: targetProfile, error: targetError } = await context.supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (targetError) {
    return {
      ok: false,
      message: targetError.message
    };
  }

  if (!targetProfile) {
    return {
      ok: false,
      message: "找不到此使用者的 profile。"
    };
  }

  if (context.user?.id === userId && nextRole !== "super_admin") {
    return {
      ok: false,
      message: "不能降級自己的 Super Admin 權限，請由另一位 Super Admin 操作。"
    };
  }

  if (targetProfile.role === "super_admin" && nextRole !== "super_admin") {
    const { count, error: countError } = await context.supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");

    if (countError) {
      return {
        ok: false,
        message: countError.message
      };
    }

    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        message: "不能移除最後一位 Super Admin，否則後台會被鎖死。"
      };
    }
  }

  return null;
}
