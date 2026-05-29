"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ImageUp, Loader2, Save, XCircle } from "lucide-react";
import { getEmployerWorkspaceContext } from "@/lib/employer-workspace";
import { supabase } from "@/lib/supabase/client";
import type { Company } from "@/lib/types";

type Toast = {
  type: "success" | "error";
  message: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return "發生未知錯誤，請稍後再試。";
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }

  return null;
}

function isEmptyCompanyReadError(error: unknown) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    code === "PGRST116" ||
    code === "PGRST205" ||
    code === "42P01" ||
    code === "42703" ||
    message.includes("could not find the table") ||
    (message.includes("column") && message.includes("does not exist")) ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

export default function EmployerCompanyPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [canManageCompany, setCanManageCompany] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const fetchCompany = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      setToast({
        type: "error",
        message: "尚未設定 Supabase 環境變數，無法讀取公司資料。"
      });
      return;
    }

    try {
      setIsLoading(true);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error("尚未登入。");
      }

      const workspaceResult = await getEmployerWorkspaceContext(supabase, user.id);

      if (workspaceResult.error && !workspaceResult.isSchemaMissing) {
        throw new Error(workspaceResult.error);
      }

      if (workspaceResult.error && workspaceResult.isSchemaMissing) {
        console.warn("[employer-company] workspace schema is not ready", workspaceResult.error);
      }

      if (!workspaceResult.context?.company) {
        setCompany(null);
        setLogoUrl("");
        setCanManageCompany(true);
        return;
      }

      setCompany((workspaceResult.context.company as Company | null) ?? null);
      setLogoUrl(workspaceResult.context.company.logo_url ?? "");
      setCanManageCompany(workspaceResult.context.canManageCompany);
    } catch (error) {
      if (isEmptyCompanyReadError(error)) {
        console.warn("[employer-company] empty company profile state", error);
        setCompany(null);
        setLogoUrl("");
        setCanManageCompany(true);
        return;
      }

      setToast({
        type: "error",
        message: `公司資料讀取失敗：${getErrorMessage(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!canManageCompany) {
      setToast({
        type: "error",
        message: "你目前沒有公司品牌設定的管理權限。"
      });
      return;
    }

    if (!supabase) {
      setToast({
        type: "error",
        message: "尚未設定 Supabase 環境變數，無法上傳 Logo。"
      });
      return;
    }

    try {
      setIsUploading(true);

      const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const filePath = `company-logos/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("public-assets").upload(filePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false
      });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage.from("public-assets").getPublicUrl(filePath);
      setLogoUrl(data.publicUrl);
      setToast({
        type: "success",
        message: "Logo 已上傳，請儲存公司資料。"
      });
    } catch (error) {
      setToast({
        type: "error",
        message: `Logo 上傳失敗：${getErrorMessage(error)}`
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setToast({
        type: "error",
        message: "尚未設定 Supabase 環境變數，無法儲存公司資料。"
      });
      return;
    }

    const formData = new FormData(event.currentTarget);

    try {
      setIsSaving(true);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error("尚未登入。");
      }

      const workspaceResult = await getEmployerWorkspaceContext(supabase, user.id);
      const payload = {
        name: formData.get("name")?.toString().trim() ?? "",
        logo_url: logoUrl || null,
        website: formData.get("website")?.toString().trim() || null,
        description: formData.get("description")?.toString().trim() || null
      };

      if (workspaceResult.error && !workspaceResult.isSchemaMissing) {
        throw new Error(workspaceResult.error);
      }

      if (workspaceResult.context?.company) {
        if (!workspaceResult.context.canManageCompany) {
          throw new Error("只有公司 Admin 可以更新公司品牌資料。");
        }

        const { error } = await supabase
          .from("companies")
          .update(payload)
          .eq("id", workspaceResult.context.company.id);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.from("companies").upsert(
          {
            employer_id: user.id,
            ...payload
          },
          { onConflict: "employer_id" }
        );

        if (error) {
          throw error;
        }
      }

      setToast({
        type: "success",
        message: "公司品牌資料已更新。"
      });
      await fetchCompany();
    } catch (error) {
      setToast({
        type: "error",
        message: `公司資料儲存失敗：${getErrorMessage(error)}`
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          className={`fixed bottom-5 right-5 z-[90] flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5" aria-hidden="true" />
          )}
          {toast.message}
        </div>
      ) : null}

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Company Profile
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">公司品牌設定</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          這些資訊會出現在職缺詳情頁的雇主資訊區塊。
        </p>
      </section>

      {!canManageCompany ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          你目前是 Recruiter，只有公司 Admin 可以更新公司品牌設定。
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid gap-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {isLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
          ) : (
            <>
              <label className="block">
                <span className="text-sm font-medium text-gray-900">公司名稱</span>
                <input
                  name="name"
                  required
                  defaultValue={company?.name ?? ""}
                  disabled={!canManageCompany}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-900">官網連結</span>
                <input
                  name="website"
                  defaultValue={company?.website ?? ""}
                  placeholder="https://company.com"
                  disabled={!canManageCompany}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-900">公司簡介</span>
                <textarea
                  name="description"
                  rows={6}
                  defaultValue={company?.description ?? ""}
                  disabled={!canManageCompany}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={isSaving || isUploading || isLoading || !canManageCompany}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            儲存公司資料
          </button>
        </div>

        <aside className="rounded-xl bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-900">公司 Logo</p>
          <div className="mt-4 flex aspect-square items-center justify-center rounded-xl bg-white bg-contain bg-center bg-no-repeat shadow-sm ring-1 ring-gray-200"
            style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : undefined}
          >
            {!logoUrl ? <ImageUp className="h-10 w-10 text-gray-300" aria-hidden="true" /> : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={isUploading || isSaving || !canManageCompany}
            onChange={handleLogoUpload}
            className="mt-4 w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          {isUploading ? (
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Logo 上傳中...
            </p>
          ) : null}
        </aside>
      </form>
    </div>
  );
}
