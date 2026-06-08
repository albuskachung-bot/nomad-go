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

const passwordUppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const passwordLowercase = "abcdefghijkmnopqrstuvwxyz";
const passwordNumbers = "23456789";
const passwordSymbols = "!@#$%^&*()-_=+[]{}";
const passwordCharacters =
  passwordUppercase + passwordLowercase + passwordNumbers + passwordSymbols;
const postgresLogHint =
  "請至 Supabase Dashboard 的 Auth Logs 與 Postgres Logs 檢查 Auth Trigger 或資料庫函式的底層錯誤。";

function getSecureRandomIndex(length: number) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % length;
}

function getRandomPasswordCharacter(characters: string) {
  return characters[getSecureRandomIndex(characters.length)];
}

function createRandomPassword() {
  const characters = [
    getRandomPasswordCharacter(passwordUppercase),
    getRandomPasswordCharacter(passwordLowercase),
    getRandomPasswordCharacter(passwordNumbers),
    getRandomPasswordCharacter(passwordSymbols)
  ];

  while (characters.length < 24) {
    characters.push(getRandomPasswordCharacter(passwordCharacters));
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = getSecureRandomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [
      characters[swapIndex],
      characters[index]
    ];
  }

  return characters.join("");
}

function waitForAuthTrigger(ms = 500) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function appendPostgresLogHint(message: string) {
  return `${message} ${postgresLogHint}`;
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

function getErrorField(error: unknown, field: string) {
  if (typeof error !== "object" || error === null || !(field in error)) {
    return null;
  }

  const value = (error as Record<string, unknown>)[field];
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return null;
}

function formatSupabaseError(error: unknown) {
  const message = getErrorMessage(error);
  const code = getErrorField(error, "code");
  const status = getErrorField(error, "status");
  const details = getErrorField(error, "details");
  const hint = getErrorField(error, "hint");

  return [
    message,
    code ? `code: ${code}` : null,
    status ? `status: ${status}` : null,
    details ? `details: ${details}` : null,
    hint ? `hint: ${hint}` : null
  ]
    .filter(Boolean)
    .join(" | ");
}

function getSupabaseErrorLogFields(error: unknown) {
  return {
    message: getErrorMessage(error),
    code: getErrorField(error, "code"),
    status: getErrorField(error, "status"),
    details: getErrorField(error, "details"),
    hint: getErrorField(error, "hint"),
    name: getErrorField(error, "name")
  };
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
  let supabaseAdmin: ReturnType<typeof createVirtualAuthorAdminClient>;

  try {
    supabaseAdmin = createVirtualAuthorAdminClient();
  } catch (error) {
    const message = `Service Role 初始化失敗：${formatSupabaseError(error)}`;
    console.error("[virtual-authors] Failed to initialize service role client.", {
      ...getSupabaseErrorLogFields(error),
      error
    });
    redirectWithError(message);
  }

  const email = createInternalVirtualAuthorEmail();
  const password = createRandomPassword();
  const userMetadata = {
    full_name: fullName,
    name: fullName,
    title,
    job_title: title,
    avatar_url: avatarUrl,
    bio,
    account_type: "nomad",
    role: "member",
    is_virtual_author: true
  };
  let authFailure:
    | {
        message: string;
        error: unknown;
      }
    | null = null;
  let authUserId: string | null = null;

  try {
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userMetadata
      });

    if (authError) {
      authFailure = {
        message: appendPostgresLogHint(
          `Auth 失敗：${formatSupabaseError(authError)}`
        ),
        error: authError
      };
    } else if (!authData.user?.id) {
      authFailure = {
        message: appendPostgresLogHint(
          "Auth 失敗：建立 Auth 幽靈帳號成功，但 Supabase 未回傳 user.id。"
        ),
        error: null
      };
    } else {
      authUserId = authData.user.id;
    }
  } catch (error) {
    authFailure = {
      message: appendPostgresLogHint(`Auth 失敗：${formatSupabaseError(error)}`),
      error
    };
  }

  if (authFailure) {
    console.error("[virtual-authors] Failed to create ghost auth user.", {
      stage: "auth.admin.createUser",
      email,
      userMetadata,
      ...getSupabaseErrorLogFields(authFailure.error),
      error: authFailure.error
    });
    redirectWithError(authFailure.message);
  }

  virtualUserId = authUserId;
  await waitForAuthTrigger();

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

  let profileFailure:
    | {
        message: string;
        error: unknown;
      }
    | null = null;

  try {
    const { data: upsertedProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: virtualUserId,
          ...profileFields
        } as never,
        { onConflict: "id" }
      )
      .select("id")
      .maybeSingle();

    if (profileError) {
      profileFailure = {
        message: appendPostgresLogHint(
          `Profile upsert 失敗：${formatSupabaseError(profileError)}`
        ),
        error: profileError
      };
    } else if (!upsertedProfile) {
      profileFailure = {
        message: appendPostgresLogHint(
          "Profile upsert 失敗：Supabase 未回傳 upsert 後的 profile.id。"
        ),
        error: null
      };
    }
  } catch (error) {
    profileFailure = {
      message: appendPostgresLogHint(
        `Profile upsert 失敗：${formatSupabaseError(error)}`
      ),
      error
    };
  }

  if (profileFailure) {
    console.error("[virtual-authors] Failed to upsert virtual author profile.", {
      stage: "profiles.upsert",
      virtualUserId,
      ...getSupabaseErrorLogFields(profileFailure.error),
      error: profileFailure.error
    });

    if (virtualUserId) {
      try {
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

    redirectWithError(profileFailure.message);
  }

  revalidatePath("/admin/virtual-authors");
  revalidatePath("/admin/posts/create");
  revalidatePath("/talent");
  redirect("/admin/virtual-authors?created=1");
}
