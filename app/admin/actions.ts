"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { canManageSiteSettings, isAdminRole, type AdminRole } from "@/lib/admin-auth";
import { getCurrentAdminContext } from "@/lib/admin";
import type { ContentStatus, ProfileRole } from "@/lib/types";

type CurationTable = "jobs" | "guides" | "talents" | "profiles";
type UserManagementRole = ProfileRole;
type ActionResult = {
  ok: boolean;
  message: string;
};

const curationTables: CurationTable[] = ["jobs", "guides", "talents", "profiles"];
const statuses: ContentStatus[] = ["pending", "published", "rejected"];
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

export async function updateAdminContentItem(formData: FormData) {
  const context = await requireAdmin();
  const { supabase, profile } = context;
  const table = formData.get("table")?.toString() as CurationTable;
  const id = formData.get("id")?.toString();
  const nextFeatured = formData.get("next_featured")?.toString();
  const nextStatus = formData.get("next_status")?.toString() as ContentStatus | undefined;

  if (!curationTables.includes(table) || !id) {
    throw new Error("Invalid curation payload");
  }

  if (profile?.role === "reviewer" && table !== "jobs" && table !== "profiles") {
    return {
      ok: false,
      message: "Reviewer 只能審核職缺與企業/會員資料。"
    };
  }

  const update: {
    is_featured?: boolean;
    status?: ContentStatus;
  } = {};

  if (nextFeatured === "true" || nextFeatured === "false") {
    update.is_featured = nextFeatured === "true";
  }

  if (nextStatus && statuses.includes(nextStatus)) {
    update.status = nextStatus;
  }

  if (Object.keys(update).length === 0) {
    return {
      ok: false,
      message: "沒有可更新的欄位。"
    };
  }

  let errorMessage: string | null = null;

  if (table === "jobs") {
    const { error } = await supabase.from("jobs").update(update).eq("id", id);
    errorMessage = error?.message ?? null;
  }

  if (table === "guides") {
    const { error } = await supabase.from("guides").update(update).eq("id", id);
    errorMessage = error?.message ?? null;
  }

  if (table === "talents") {
    const { error } = await supabase.from("talents").update(update).eq("id", id);
    errorMessage = error?.message ?? null;
  }

  if (table === "profiles") {
    const { error } = await supabase.from("profiles").update(update).eq("id", id);
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
  revalidatePath("/admin/guides");
  revalidatePath("/admin/talent");
  revalidatePath("/");

  return {
    ok: true,
    message: "已更新。"
  };
}

export async function updateSiteSettings(formData: FormData) {
  const context = await requireAdmin();
  const { supabase, profile } = context;

  if (!canManageSiteSettings(profile?.role)) {
    return {
      ok: false,
      message: "只有 Super Admin 或 Editor 可以更新全站設定。"
    };
  }

  const heroTitle = formData.get("hero_title")?.toString().trim();
  const heroSubtitle = formData.get("hero_subtitle")?.toString().trim();
  const currentHeroImageUrl = formData.get("current_hero_image_url")?.toString().trim() ?? "";
  const heroImage = formData.get("hero_image");

  if (!heroTitle || !heroSubtitle) {
    return {
      ok: false,
      message: "請填寫主標題與副標題。"
    };
  }

  let heroImageUrl = currentHeroImageUrl;

  if (heroImage instanceof File && heroImage.size > 0) {
    const extension = heroImage.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filePath = `hero/${Date.now()}-${randomUUID()}.${extension}`;
    const fileBuffer = Buffer.from(await heroImage.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("public-assets")
      .upload(filePath, fileBuffer, {
        contentType: heroImage.type || "application/octet-stream",
        upsert: false
      });

    if (uploadError) {
      return {
        ok: false,
        message: uploadError.message
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from("public-assets")
      .getPublicUrl(filePath);

    heroImageUrl = publicUrlData.publicUrl;
  }

  const { error } = await supabase
    .from("site_settings")
    .update({
      hero_title: heroTitle,
      hero_subtitle: heroSubtitle,
      hero_image_url: heroImageUrl
    })
    .eq("id", 1);

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/");

  return {
    ok: true,
    message: "首頁設定已更新。"
  };
}

export async function updateAdminRoleByEmail(formData: FormData) {
  return promoteTeamMemberByEmail(formData);
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

export async function promoteTeamMemberByEmail(formData: FormData): Promise<ActionResult> {
  const context = await requireSuperAdmin();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const role = formData.get("role")?.toString();

  if (!email || !isAssignableAdminRole(role)) {
    return {
      ok: false,
      message: "請輸入有效 Email，並選擇後台角色。"
    };
  }

  const { error } = await context.supabase.rpc("set_admin_role_by_email", {
    target_email: email,
    target_role: role
  });

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  revalidatePath("/admin/team");
  revalidatePath("/admin/users");
  revalidatePath("/admin/user-roles");

  return {
    ok: true,
    message: "已新增或更新管理員權限。"
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
