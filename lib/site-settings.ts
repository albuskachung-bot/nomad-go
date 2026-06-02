import { unstable_cache } from "next/cache";
import { createSupabasePublicServerClient } from "@/lib/supabase/server";

export type FooterSocialLinks = Record<string, string>;

export type FooterSettings = {
  footer_description: string;
  contact_email: string;
  social_links: FooterSocialLinks;
};

export const defaultFooterSettings: FooterSettings = {
  footer_description:
    "為華語遠端工作者整理職缺、城市情報與出發工具，讓每一次移動都更有掌握。",
  contact_email: "hello@nomad-go.example",
  social_links: {
    instagram: "",
    threads: ""
  }
};

function normalizeSocialLinks(value: unknown): FooterSocialLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultFooterSettings.social_links;
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, link]) => [key, typeof link === "string" ? link.trim() : ""])
      .filter(([key]) => key.trim().length > 0)
  );
}

async function fetchFooterSettings(): Promise<FooterSettings> {
  const supabase = createSupabasePublicServerClient();

  if (!supabase) {
    return defaultFooterSettings;
  }
  const { data, error } = await supabase
    .from("site_settings")
    .select("footer_description, contact_email, social_links")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to fetch footer settings from Supabase:", error?.message);
    }

    return defaultFooterSettings;
  }

  return {
    footer_description:
      data.footer_description?.trim() || defaultFooterSettings.footer_description,
    contact_email: data.contact_email?.trim() || defaultFooterSettings.contact_email,
    social_links: normalizeSocialLinks(data.social_links)
  };
}

export const getCachedFooterSettings = unstable_cache(
  fetchFooterSettings,
  ["site-footer-settings"],
  {
    revalidate: 300,
    tags: ["site-settings"]
  }
);
