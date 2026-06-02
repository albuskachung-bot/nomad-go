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

function createPostSlug(title: string) {
  let normalized = "";
  let previousWasDash = false;

  Array.from(title.normalize("NFKD").toLowerCase()).forEach((char) => {
    const isLatinOrNumber = /[a-z0-9]/.test(char);
    const isCjk = /[\u3400-\u9fff]/.test(char);
    const isSeparator = /\s|-/.test(char);

    if (isLatinOrNumber || isCjk) {
      normalized += char;
      previousWasDash = false;
      return;
    }

    if (isSeparator && normalized && !previousWasDash) {
      normalized += "-";
      previousWasDash = true;
    }
  });

  normalized = normalized
    .normalize("NFKD")
    .trim()
    .replace(/^-|-$/g, "");

  return normalized || `post-${Date.now()}`;
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
    const content = readText(formData.get("content"));
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

    const baseSlug = createPostSlug(title);
    const slug = await getUniqueSlug(baseSlug, postId);

    const payload: Database["public"]["Tables"]["posts"]["Update"] = {
      title,
      slug,
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
