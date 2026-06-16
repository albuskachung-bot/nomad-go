"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdminContext } from "@/lib/admin";
import type { Post } from "@/lib/types";

type PostActionResult = {
  ok: boolean;
  message: string;
  postId?: string;
  slug?: string;
};

function readText(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function readOptionalText(value: FormDataEntryValue | null) {
  const text = readText(value);
  return text.length > 0 ? text : null;
}

function readTags(value: FormDataEntryValue | null) {
  return (value?.toString() ?? "")
    .split(/[、,，\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function readCategory(value: FormDataEntryValue | null) {
  const category = readText(value);
  const allowedCategories = new Set([
    "general",
    "city_guide",
    "career",
    "nomad_life"
  ]);

  return allowedCategories.has(category) ? category : "general";
}

function createPostSlug(title: string) {
  const normalized = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .trim()
    .replace(/^-|-$/g, "");

  return normalized || `post-${crypto.randomUUID().slice(0, 8)}`;
}

async function getUniqueSlug(baseSlug: string, currentPostId: string | null) {
  const context = await getCurrentAdminContext();
  const supabase = createSupabaseAdminClient() ?? context.supabase;

  if (!supabase) {
    return baseSlug;
  }

  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    let query = supabase.from("posts").select("id").eq("slug", candidate).limit(1);

    if (currentPostId) {
      query = query.neq("id", currentPostId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function saveAdminPost(formData: FormData): Promise<PostActionResult> {
  try {
    const context = await getCurrentAdminContext();
    const { supabase, user, profile, isSuperAdmin } = context;

    if (!supabase || !user) {
      return {
        ok: false,
        message: "請先登入營運後台。"
      };
    }

    if (!isSuperAdmin && profile?.role !== "super_admin") {
      return {
        ok: false,
        message: "只有 super_admin 可以發布官方專欄。"
      };
    }

    const db = createSupabaseAdminClient() ?? supabase;
    const postId = readOptionalText(formData.get("post_id"));
    const title = readText(formData.get("title"));
    const requestedSlug = readOptionalText(formData.get("slug"));
    const content = readText(formData.get("content"));
    const category = readCategory(formData.get("category"));
    const coverImageUrl = readOptionalText(formData.get("cover_image_url"));
    const tags = readTags(formData.get("tags"));
    const isPublished = formData.get("is_published") === "true";
    const isOfficial = formData.get("is_official") === "true";
    const selectedAuthorId = readText(formData.get("selected_author_id")) || user.id;

    if (!title) {
      return {
        ok: false,
        message: "請輸入文章標題。"
      };
    }

    if (!content) {
      return {
        ok: false,
        message: "請輸入文章內容。"
      };
    }

    const canUseSelectedAuthor = selectedAuthorId === user.id;

    if (!canUseSelectedAuthor) {
      const { data: selectedAuthor, error: selectedAuthorError } = await db
        .from("profiles")
        .select("id,is_virtual_author")
        .eq("id", selectedAuthorId)
        .eq("is_virtual_author", true)
        .maybeSingle();

      if (selectedAuthorError || !selectedAuthor) {
        return {
          ok: false,
          message: "請選擇有效的管理員或虛擬作者身分。"
        };
      }
    }

    const baseSlug = createPostSlug(requestedSlug ?? title);
    const slug = await getUniqueSlug(baseSlug, postId);
    const payload = {
      author_id: selectedAuthorId,
      title,
      slug,
      category,
      content,
      tags,
      cover_image_url: coverImageUrl,
      is_published: isPublished,
      is_official: isOfficial
    };

    let savedPost: Pick<Post, "id" | "slug"> | null = null;

    if (postId) {
      const { data, error } = await db
        .from("posts")
        .update(payload as never)
        .eq("id", postId)
        .select("id, slug")
        .single();

      if (error) {
        return {
          ok: false,
          message: error.message
        };
      }

      savedPost = data as Pick<Post, "id" | "slug">;
    } else {
      const { data, error } = await db
        .from("posts")
        .insert(payload as never)
        .select("id, slug")
        .single();

      if (error) {
        return {
          ok: false,
          message: error.message
        };
      }

      savedPost = data as Pick<Post, "id" | "slug">;
    }

    revalidatePath("/admin/posts");
    revalidatePath("/admin/posts/create");
    revalidatePath("/blog");

    if (savedPost?.slug) {
      revalidatePath(`/blog/${savedPost.slug}`);
    }

    return {
      ok: true,
      message: isPublished ? "官方專欄已發布。" : "官方專欄草稿已儲存。",
      postId: savedPost?.id,
      slug: savedPost?.slug
    };
  } catch (error) {
    console.error("[admin-posts] Failed to save official post.", error);

    return {
      ok: false,
      message: "官方專欄儲存失敗，請稍後再試。"
    };
  }
}
