"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdminContext } from "@/lib/admin";

function readText(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function readOptionalText(value: FormDataEntryValue | null) {
  const text = readText(value);
  return text.length > 0 ? text : null;
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

  const db = createSupabaseAdminClient() ?? supabase;
  const { error } = await db.from("profiles").insert({
    id: crypto.randomUUID(),
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
  } as never);

  if (error) {
    console.error("[virtual-authors] Failed to create virtual author.", error);
    redirect("/admin/virtual-authors?error=create-failed");
  }

  revalidatePath("/admin/virtual-authors");
  revalidatePath("/admin/posts/create");
  revalidatePath("/talent");
  redirect("/admin/virtual-authors?created=1");
}
