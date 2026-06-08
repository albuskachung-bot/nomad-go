"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminContext } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PlatformPlacementLocation } from "@/lib/types";

const placementLocations: PlatformPlacementLocation[] = [
  "announcement_bar",
  "hero_banner",
  "in_feed_ad"
];

function readText(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function readOptionalText(value: FormDataEntryValue | null) {
  const text = readText(value);
  return text.length > 0 ? text : null;
}

function readLocation(value: FormDataEntryValue | null) {
  const location = readText(value);

  return placementLocations.includes(location as PlatformPlacementLocation)
    ? (location as PlatformPlacementLocation)
    : null;
}

function readMarqueeSpeed(value: FormDataEntryValue | null) {
  const speed = Number.parseInt(readText(value), 10);
  return Number.isFinite(speed) && speed > 0 ? speed : 15;
}

function getImageExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && /^[a-z0-9]+$/.test(extension)) {
    return extension;
  }

  return file.type.split("/").pop()?.toLowerCase() ?? "png";
}

async function requirePlacementAdmin() {
  const context = await getCurrentAdminContext();

  if (!context.supabase || !context.user) {
    redirect("/admin/login");
  }

  if (!["super_admin", "editor"].includes(context.profile?.role ?? "")) {
    redirect("/admin");
  }

  return {
    supabase: createSupabaseAdminClient() ?? context.supabase
  };
}

export async function createPlacement(formData: FormData) {
  const { supabase } = await requirePlacementAdmin();
  const location = readLocation(formData.get("location"));
  const title = readText(formData.get("title"));
  const sortOrder = Number.parseInt(readText(formData.get("sort_order")), 10);
  const isMarquee = formData.get("is_marquee") === "on";
  const file = formData.get("image_file");

  if (!location || !title) {
    redirect("/admin/placements?error=missing-required-fields");
  }

  let imageUrl: string | null = null;

  if (file instanceof File && file.size > 0) {
    const extension = getImageExtension(file);
    const fileName = `placements/placement-${Date.now()}-${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("public-assets")
      .upload(fileName, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false
      });

    if (uploadError) {
      redirect(`/admin/placements?error=${encodeURIComponent(uploadError.message)}`);
    }

    const { data } = supabase.storage.from("public-assets").getPublicUrl(fileName);
    imageUrl = data.publicUrl;
  }

  const { error } = await supabase.from("platform_placements").insert({
    location,
    title,
    subtitle: readOptionalText(formData.get("subtitle")),
    image_url: imageUrl,
    link_url: readOptionalText(formData.get("link_url")),
    link_text: readOptionalText(formData.get("link_text")),
    is_active: formData.get("is_active") === "on",
    is_marquee: isMarquee,
    marquee_speed: isMarquee ? readMarqueeSpeed(formData.get("marquee_speed")) : 15,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0
  });

  if (error) {
    redirect(`/admin/placements?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/placements");
  redirect("/admin/placements?created=1");
}

export async function updatePlacement(id: string, formData: FormData) {
  const { supabase } = await requirePlacementAdmin();
  const placementId = readText(id);
  const location = readLocation(formData.get("location"));
  const title = readText(formData.get("title"));
  const sortOrder = Number.parseInt(readText(formData.get("sort_order")), 10);
  const isMarquee = formData.get("is_marquee") === "on";
  const file = formData.get("image_file");
  let imageUrl = readOptionalText(formData.get("current_image_url"));

  if (!placementId) {
    redirect("/admin/placements?error=missing-placement-id");
  }

  if (!location || !title) {
    redirect("/admin/placements?error=missing-required-fields");
  }

  if (file instanceof File && file.size > 0) {
    const extension = getImageExtension(file);
    const fileName = `placements/placement-${Date.now()}-${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("public-assets")
      .upload(fileName, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false
      });

    if (uploadError) {
      redirect(`/admin/placements?error=${encodeURIComponent(uploadError.message)}`);
    }

    const { data } = supabase.storage.from("public-assets").getPublicUrl(fileName);
    imageUrl = data.publicUrl;
  }

  const { error } = await supabase
    .from("platform_placements")
    .update({
      location,
      title,
      subtitle: readOptionalText(formData.get("subtitle")),
      image_url: imageUrl,
      link_url: readOptionalText(formData.get("link_url")),
      link_text: readOptionalText(formData.get("link_text")),
      is_active: formData.get("is_active") === "on",
      is_marquee: isMarquee,
      marquee_speed: isMarquee ? readMarqueeSpeed(formData.get("marquee_speed")) : 15,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0
    })
    .eq("id", placementId);

  if (error) {
    redirect(`/admin/placements?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/placements");
  redirect("/admin/placements?updated=1");
}
