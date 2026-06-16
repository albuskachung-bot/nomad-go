"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Post } from "@/lib/types";

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

async function getUniqueSlug(
  baseSlug: string,
  currentPostId: string | null
) {
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient());

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

export async function saveNomadPost(formData: FormData): Promise<PostActionResult> {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return {
        ok: false,
        message: "尚未設定 Supabase 環境變數，無法儲存文章。"
      };
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        message: "請先登入會員中心。"
      };
    }

    const postId = readOptionalText(formData.get("post_id"));
    const title = readText(formData.get("title"));
    const requestedSlug = readOptionalText(formData.get("slug"));
    const content = readText(formData.get("content"));
    const category = readCategory(formData.get("category"));
    const coverImageUrl = readOptionalText(formData.get("cover_image_url"));
    const tags = readTags(formData.get("tags"));
    const isPublished = formData.get("is_published") === "true";

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

    const baseSlug = createPostSlug(requestedSlug ?? title);
    const slug = await getUniqueSlug(baseSlug, postId);

    const payload: Database["public"]["Tables"]["posts"]["Update"] = {
      title,
      slug,
      category,
      content,
      tags,
      cover_image_url: coverImageUrl,
      is_published: isPublished
    };

    let savedPost: Pick<Post, "id" | "slug"> | null = null;

    if (postId) {
      const { data, error } = await supabase
        .from("posts")
        .update(payload)
        .eq("id", postId)
        .eq("author_id", user.id)
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
      const insertPayload: Database["public"]["Tables"]["posts"]["Insert"] = {
        author_id: user.id,
        title,
        slug,
        category,
        content,
        tags,
        cover_image_url: coverImageUrl,
        is_published: isPublished
      };

      const { data, error } = await supabase
        .from("posts")
        .insert(insertPayload)
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

    revalidatePath("/dashboard/nomad/posts");
    revalidatePath("/blog");

    if (savedPost?.slug) {
      revalidatePath(`/blog/${savedPost.slug}`);
    }

    return {
      ok: true,
      message: isPublished ? "文章已發布。" : "草稿已儲存。",
      postId: savedPost?.id,
      slug: savedPost?.slug
    };
  } catch (error) {
    console.error("[nomad-posts] Failed to save post.", error);

    return {
      ok: false,
      message: "文章儲存失敗，請稍後再試。"
    };
  }
}

export async function deleteNomadPost(formData: FormData): Promise<PostActionResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      message: "尚未設定 Supabase 環境變數，無法刪除文章。"
    };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      message: "請先登入會員中心。"
    };
  }

  const postId = readOptionalText(formData.get("post_id"));
  const slug = readOptionalText(formData.get("slug"));

  if (!postId) {
    return {
      ok: false,
      message: "文章資料不完整。"
    };
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id);

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  revalidatePath("/dashboard/nomad/posts");
  revalidatePath("/blog");

  if (slug) {
    revalidatePath(`/blog/${slug}`);
  }

  return {
    ok: true,
    message: "文章已刪除。"
  };
}
