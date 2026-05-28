"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentAdminContext } from "@/lib/admin";
import type { ContentStatus } from "@/lib/types";

type CurationTable = "jobs" | "guides" | "talents" | "profiles";
type UserManagementRole = "user" | "editor" | "super_admin";

const curationTables: CurationTable[] = ["jobs", "guides", "talents", "profiles"];
const statuses: ContentStatus[] = ["pending", "published", "rejected"];
const userManagementRoles: UserManagementRole[] = ["user", "editor", "super_admin"];

function isUserManagementRole(role: string | undefined): role is UserManagementRole {
  return Boolean(role && userManagementRoles.includes(role as UserManagementRole));
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
  const { supabase } = await requireAdmin();
  const table = formData.get("table")?.toString() as CurationTable;
  const id = formData.get("id")?.toString();
  const nextFeatured = formData.get("next_featured")?.toString();
  const nextStatus = formData.get("next_status")?.toString() as ContentStatus | undefined;

  if (!curationTables.includes(table) || !id) {
    throw new Error("Invalid curation payload");
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
  const { supabase } = await requireAdmin();

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
  const context = await requireSuperAdmin();

  const email = formData.get("email")?.toString().trim();
  const role = formData.get("role")?.toString();

  if (!email || !isUserManagementRole(role)) {
    throw new Error("Invalid role payload");
  }

  await context.supabase.rpc("set_admin_role_by_email", {
    target_email: email,
    target_role: role
  });

  revalidatePath("/admin/user-roles");
  revalidatePath("/admin/users");
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

  if (context.user?.id === userId && role !== "super_admin") {
    return {
      ok: false,
      message: "不能移除自己的 Super Admin 權限。"
    };
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

  return {
    ok: true,
    message: "使用者權限已更新。"
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

  return {
    ok: true,
    message: isBanned ? "使用者已停權。" : "使用者已解除停權。"
  };
}
