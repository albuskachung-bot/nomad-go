"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getCurrentAdminContext } from "@/lib/admin";
import type { Database } from "@/lib/types";

function readText(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function readOptionalText(value: FormDataEntryValue | null) {
  const text = readText(value);
  return text.length > 0 ? text : null;
}

function createVirtualAuthorAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "尚未設定 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，無法建立虛擬作者。"
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function createInternalVirtualAuthorEmail() {
  const randomSuffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  return `virtual_${Date.now()}_${randomSuffix}@nomad-go.internal`;
}

function createRandomPassword() {
  return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "建立虛擬作者時發生未知錯誤。";
}

function redirectWithError(message: string): never {
  const params = new URLSearchParams({
    error: "create-failed",
    message
  });

  redirect(`/admin/virtual-authors?${params.toString()}`);
}

export async function createVirtualAuthor(formData: FormData) {
  const context = await getCurrentAdminContext();
  const { supabase, user, profile, isSuperAdmin } = context;

  if (!supabase || !user) {
    redirect("/admin/login");
  }

  if (!isSuperAdmin && profile?.role !== "super_admin") {
    redirect("/admin");
  }

  const fullName = readText(formData.get("full_name"));
  const title = readOptionalText(formData.get("title"));
  const avatarUrl = readOptionalText(formData.get("avatar_url"));
  const bio = readOptionalText(formData.get("bio"));

  if (!fullName) {
    redirect("/admin/virtual-authors?error=missing-name");
  }

  let virtualUserId: string | null = null;

  try {
    const supabaseAdmin = createVirtualAuthorAdminClient();
    const email = createInternalVirtualAuthorEmail();
    const password = createRandomPassword();

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          is_virtual_author: true,
          full_name: fullName
        }
      });

    if (authError) {
      throw new Error(`建立 Auth 幽靈帳號失敗：${authError.message}`);
    }

    if (!authData.user?.id) {
      throw new Error("建立 Auth 幽靈帳號成功，但 Supabase 未回傳 user.id。");
    }

    virtualUserId = authData.user.id;

    const profileFields = {
      role: "member",
      account_type: "nomad",
      full_name: fullName,
      title,
      job_title: title,
      avatar_url: avatarUrl,
      bio,
      skills: [],
      location: null,
      status: "published",
      is_featured: false,
      is_banned: false,
      timezone: null,
      languages: [],
      work_type: [],
      portfolio_url: null,
      social_urls: {},
      work_experience: [],
      education: [],
      is_public: true,
      is_virtual_author: true,
      sponsored_until: null,
      stripe_customer_id: null
    };

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(profileFields as never)
      .eq("id", virtualUserId)
      .select("id")
      .maybeSingle();

    if (updateError) {
      throw new Error(`更新虛擬作者 Profile 失敗：${updateError.message}`);
    }

    if (!updatedProfile) {
      const { error: insertError } = await supabaseAdmin.from("profiles").insert({
        id: virtualUserId,
        ...profileFields
      } as never);

      if (insertError) {
        throw new Error(`建立虛擬作者 Profile 失敗：${insertError.message}`);
      }
    }
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[virtual-authors] Failed to create virtual author.", {
      message,
      virtualUserId,
      error
    });

    if (virtualUserId) {
      try {
        const supabaseAdmin = createVirtualAuthorAdminClient();
        const { error: deleteError } =
          await supabaseAdmin.auth.admin.deleteUser(virtualUserId);

        if (deleteError) {
          console.error("[virtual-authors] Failed to rollback ghost auth user.", {
            virtualUserId,
            message: deleteError.message,
            error: deleteError
          });
        }
      } catch (rollbackError) {
        console.error("[virtual-authors] Rollback ghost auth user threw.", {
          virtualUserId,
          message: getErrorMessage(rollbackError),
          error: rollbackError
        });
      }
    }

    redirectWithError(message);
  }

  revalidatePath("/admin/virtual-authors");
  revalidatePath("/admin/posts/create");
  revalidatePath("/talent");
  redirect("/admin/virtual-authors?created=1");
}
