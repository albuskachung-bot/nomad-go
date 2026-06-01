"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  ImageUp,
  Loader2,
  Save,
  ShieldCheck,
  UploadCloud,
  XCircle
} from "lucide-react";
import { getEmployerWorkspaceContext } from "@/lib/employer-workspace";
import { supabase } from "@/lib/supabase/client";
import type { Company } from "@/lib/types";

type Toast = {
  type: "success" | "error";
  message: string;
};

const verificationBucket = "verification_docs";
const verificationMaxFileSize = 10 * 1024 * 1024;
const verificationMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const verificationExtensions = new Set(["pdf", "jpg", "jpeg", "png"]);

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

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function isSupportedVerificationFile(file: File) {
  const extension = getFileExtension(file.name);

  return verificationMimeTypes.has(file.type) || verificationExtensions.has(extension);
}

function getVerificationContentType(file: File) {
  if (verificationMimeTypes.has(file.type)) {
    return file.type;
  }

  const extension = getFileExtension(file.name);

  if (extension === "pdf") {
    return "application/pdf";
  }

  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  if (extension === "png") {
    return "image/png";
  }

  return "application/octet-stream";
}

function getFileNameFromPath(path: string) {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

export default function EmployerCompanyPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const verificationInputRef = useRef<HTMLInputElement>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [verificationDocPath, setVerificationDocPath] = useState("");
  const [canManageCompany, setCanManageCompany] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingVerificationDoc, setIsUploadingVerificationDoc] = useState(false);
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
        setVerificationDocPath("");
        setCanManageCompany(true);
        return;
      }

      setCompany((workspaceResult.context.company as Company | null) ?? null);
      setLogoUrl(workspaceResult.context.company.logo_url ?? "");
      setVerificationDocPath(workspaceResult.context.company.verification_doc_url ?? "");
      setCanManageCompany(workspaceResult.context.canManageCompany);
    } catch (error) {
      if (isEmptyCompanyReadError(error)) {
        console.warn("[employer-company] empty company profile state", error);
        setCompany(null);
        setLogoUrl("");
        setVerificationDocPath("");
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

  async function handleVerificationDocUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!canManageCompany) {
      setToast({
        type: "error",
        message: "你目前沒有公司入駐審查資料的管理權限。"
      });
      return;
    }

    if (!isSupportedVerificationFile(file)) {
      setToast({
        type: "error",
        message: "登記證明僅支援 PDF、JPG 或 PNG 檔案。"
      });
      return;
    }

    if (file.size > verificationMaxFileSize) {
      setToast({
        type: "error",
        message: "登記證明檔案大小不可超過 10MB。"
      });
      return;
    }

    if (!supabase) {
      setToast({
        type: "error",
        message: "尚未設定 Supabase 環境變數，無法上傳登記證明。"
      });
      return;
    }

    try {
      setIsUploadingVerificationDoc(true);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error("尚未登入。");
      }

      const extension = getFileExtension(file.name) || "pdf";
      const filePath = `${user.id}/company-verification/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from(verificationBucket).upload(filePath, file, {
        contentType: getVerificationContentType(file),
        upsert: false
      });

      if (error) {
        throw error;
      }

      setVerificationDocPath(filePath);
      setToast({
        type: "success",
        message: "商業登記證明已上傳，請儲存公司資料。"
      });
    } catch (error) {
      setToast({
        type: "error",
        message: `登記證明上傳失敗：${getErrorMessage(error)}`
      });
    } finally {
      setIsUploadingVerificationDoc(false);
      if (verificationInputRef.current) {
        verificationInputRef.current.value = "";
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
        description: formData.get("description")?.toString().trim() || null,
        tax_id: formData.get("tax_id")?.toString().trim() || null,
        verification_doc_url: verificationDocPath || null
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
        message: "公司資料已更新。"
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-100 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Public Brand
            </p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">
              公開品牌資訊
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              對外公開，會顯示在前台職缺與公司資訊區塊。
            </p>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
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
                      className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-gray-50"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-gray-900">官網連結</span>
                    <input
                      name="website"
                      defaultValue={company?.website ?? ""}
                      placeholder="https://company.com"
                      disabled={!canManageCompany}
                      className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-gray-50"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-gray-900">公司簡介</span>
                    <textarea
                      name="description"
                      rows={6}
                      defaultValue={company?.description ?? ""}
                      disabled={!canManageCompany}
                      className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-gray-50"
                    />
                  </label>
                </>
              )}
            </div>

            <aside className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">公司 Logo</p>
              <div
                className="mt-4 flex aspect-square items-center justify-center rounded-xl bg-white bg-contain bg-center bg-no-repeat shadow-sm ring-1 ring-gray-200"
                style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : undefined}
              >
                {!logoUrl ? (
                  <ImageUp className="h-10 w-10 text-gray-300" aria-hidden="true" />
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                disabled={isUploading || isSaving || !canManageCompany}
                onChange={handleLogoUpload}
                className="mt-4 w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60"
              />
              {isUploading ? (
                <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Logo 上傳中...
                </p>
              ) : null}
            </aside>
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-start gap-3 border-b border-gray-100 pb-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                KYB Verification
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">
                入駐審查資料
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                此區塊資料僅供平台內部審核使用，絕對保密且不會對外公開。
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-5 h-32 animate-pulse rounded-xl bg-gray-100" />
          ) : (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-900">
                  統一編號 / 企業註冊字號
                </span>
                <input
                  name="tax_id"
                  defaultValue={company?.tax_id ?? ""}
                  placeholder="請輸入統一編號或註冊字號"
                  disabled={!canManageCompany}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-gray-50"
                />
              </label>

              <div>
                <span className="text-sm font-medium text-gray-900">
                  上傳商業登記證明
                </span>
                <label className="mt-2 flex min-h-[106px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center transition hover:border-slate-400 hover:bg-white">
                  <UploadCloud className="h-7 w-7 text-slate-400" aria-hidden="true" />
                  <span className="mt-2 text-sm font-semibold text-slate-700">
                    選擇 PDF / JPG / PNG 檔案
                  </span>
                  <span className="mt-1 text-xs text-slate-500">檔案大小上限 10MB</span>
                  <input
                    ref={verificationInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                    disabled={isUploadingVerificationDoc || isSaving || !canManageCompany}
                    onChange={handleVerificationDocUpload}
                    className="sr-only"
                  />
                </label>

                {isUploadingVerificationDoc ? (
                  <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    登記證明上傳中...
                  </p>
                ) : null}

                {verificationDocPath ? (
                  <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                    <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{getFileNameFromPath(verificationDocPath)}</span>
                  </p>
                ) : (
                  <p className="mt-3 text-xs font-medium text-amber-700">
                    尚未上傳商業登記證明。
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <button
          type="submit"
          disabled={
            isSaving ||
            isUploading ||
            isUploadingVerificationDoc ||
            isLoading ||
            !canManageCompany
          }
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          儲存公司資料
        </button>
      </form>
    </div>
  );
}
