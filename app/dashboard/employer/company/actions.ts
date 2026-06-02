"use server";

import { revalidatePath } from "next/cache";
import { getEmployerWorkspaceContext, getWorkspaceErrorMessage } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types";

type CompanyProfileActionResult = {
  ok: boolean;
  message: string;
};

function readText(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text.length > 0 ? text : null;
}

function readRequiredText(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function readPerksTags(value: FormDataEntryValue | null) {
  return (value?.toString() ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function saveEmployerCompanyProfile(
  formData: FormData
): Promise<CompanyProfileActionResult> {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return {
        ok: false,
        message: "尚未設定 Supabase 環境變數，無法儲存公司資料。"
      };
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        message: "請先登入企業雇主中心。"
      };
    }

    const name = readRequiredText(formData.get("name"));

    if (!name) {
      return {
        ok: false,
        message: "請輸入公司名稱。"
      };
    }

    const workspace = await getEmployerWorkspaceContext(supabase, user.id);

    if (workspace.error && !workspace.isSchemaMissing) {
      return {
        ok: false,
        message: workspace.error
      };
    }

    const payload: Database["public"]["Tables"]["companies"]["Update"] = {
      name,
      logo_url: readText(formData.get("logo_url")),
      banner_url: readText(formData.get("banner_url")),
      website: readText(formData.get("website")),
      description: readText(formData.get("description")),
      industry: readText(formData.get("industry")),
      company_size: readText(formData.get("company_size")),
      hq_location: readText(formData.get("hq_location")),
      remote_policy: readText(formData.get("remote_policy")),
      perks_tags: readPerksTags(formData.get("perks_tags")),
      tax_id: readText(formData.get("tax_id")),
      verification_doc_url: readText(formData.get("verification_doc_url"))
    };

    let savedCompanyId: string | null = workspace.context?.company.id ?? null;

    if (workspace.context?.company) {
      if (!workspace.context.canManageCompany) {
        return {
          ok: false,
          message: "只有公司 Admin 可以更新公司品牌資料。"
        };
      }

      const { data, error } = await supabase
        .from("companies")
        .update(payload)
        .eq("id", workspace.context.company.id)
        .select("id")
        .single();

      if (error) {
        return {
          ok: false,
          message: getWorkspaceErrorMessage(error)
        };
      }

      savedCompanyId = data.id;
    } else {
      const { data, error } = await supabase
        .from("companies")
        .upsert(
          {
            employer_id: user.id,
            ...payload
          } as Database["public"]["Tables"]["companies"]["Insert"],
          { onConflict: "employer_id" }
        )
        .select("id")
        .single();

      if (error) {
        return {
          ok: false,
          message: getWorkspaceErrorMessage(error)
        };
      }

      savedCompanyId = data.id;
    }

    revalidatePath("/dashboard/employer");
    revalidatePath("/dashboard/employer/company");
    revalidatePath("/companies");

    if (savedCompanyId) {
      revalidatePath(`/companies/${savedCompanyId}`);
    }

    return {
      ok: true,
      message: "公司資料已更新。"
    };
  } catch (error) {
    console.error("[employer-company] Failed to save company profile.", error);

    return {
      ok: false,
      message: "公司資料儲存失敗，請稍後再試。"
    };
  }
}
