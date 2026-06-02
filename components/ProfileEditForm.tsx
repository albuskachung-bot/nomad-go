"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  GraduationCap,
  Globe2,
  ImageUp,
  Languages,
  LinkIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  UploadCloud,
  UserRound,
  XCircle
} from "lucide-react";
import {
  saveNomadProfile,
  type NomadProfilePayload
} from "@/app/dashboard/nomad/resume/actions";
import { supabase } from "@/lib/supabase/client";
import type { Profile, ProfileEducation, ProfileWorkExperience } from "@/lib/types";

const talentAssetsBucket = "talent_assets";
const talentAssetMaxFileSize = 8 * 1024 * 1024;
const workTypeOptions = ["全職遠距", "專案接案", "混合辦公", "兼職"];

type WorkExperienceFormItem = {
  key: string;
  company: string;
  job_title: string;
  start_date: string;
  end_date: string;
  description: string;
};

type EducationFormItem = {
  key: string;
  school: string;
  degree: string;
  graduation_year: string;
};

type ProfileFormState = {
  full_name: string;
  job_title: string;
  avatar_url: string;
  banner_url: string;
  location: string;
  timezone: string;
  skills: string;
  languages: string;
  work_type: string[];
  bio: string;
  portfolio_url: string;
  linkedin_url: string;
  github_url: string;
  work_experience: WorkExperienceFormItem[];
  education: EducationFormItem[];
  is_public: boolean;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const initialForm: ProfileFormState = {
  full_name: "",
  job_title: "",
  avatar_url: "",
  banner_url: "",
  location: "",
  timezone: "",
  skills: "",
  languages: "",
  work_type: [],
  bio: "",
  portfolio_url: "",
  linkedin_url: "",
  github_url: "",
  work_experience: [],
  education: [],
  is_public: false
};

function createKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createWorkExperienceItem(): WorkExperienceFormItem {
  return {
    key: createKey(),
    company: "",
    job_title: "",
    start_date: "",
    end_date: "",
    description: ""
  };
}

function createEducationItem(): EducationFormItem {
  return {
    key: createKey(),
    school: "",
    degree: "",
    graduation_year: ""
  };
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value: string[] | null | undefined) {
  return value?.join(", ") ?? "";
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function isSupportedImage(file: File) {
  return file.type.startsWith("image/");
}

function getImageContentType(file: File) {
  return file.type.startsWith("image/") ? file.type : "application/octet-stream";
}

function normalizeOptional(value: string) {
  return value.trim() ? value.trim() : null;
}

function socialValue(profile: Profile | null, key: string) {
  const value = profile?.social_urls?.[key];
  return typeof value === "string" ? value : "";
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeWorkExperience(
  value: Profile["work_experience"] | null | undefined
): WorkExperienceFormItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    key: createKey(),
    company: textValue(item.company),
    job_title: textValue(item.job_title),
    start_date: textValue(item.start_date),
    end_date: textValue(item.end_date),
    description: textValue(item.description)
  }));
}

function normalizeEducation(
  value: Profile["education"] | null | undefined
): EducationFormItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    key: createKey(),
    school: textValue(item.school),
    degree: textValue(item.degree),
    graduation_year: textValue(item.graduation_year)
  }));
}

function serializeWorkExperience(items: WorkExperienceFormItem[]): ProfileWorkExperience[] {
  return items
    .map((item) => ({
      company: item.company.trim(),
      job_title: item.job_title.trim(),
      start_date: item.start_date.trim(),
      end_date: item.end_date.trim() || null,
      description: item.description.trim()
    }))
    .filter((item) =>
      Boolean(item.company || item.job_title || item.start_date || item.end_date || item.description)
    );
}

function serializeEducation(items: EducationFormItem[]): ProfileEducation[] {
  return items
    .map((item) => ({
      school: item.school.trim(),
      degree: item.degree.trim(),
      graduation_year: item.graduation_year.trim()
    }))
    .filter((item) => Boolean(item.school || item.degree || item.graduation_year));
}

export default function ProfileEditForm() {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormState>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const canSubmit = useMemo(
    () => Boolean(userId && supabase && !isUploadingAvatar && !isUploadingBanner),
    [isUploadingAvatar, isUploadingBanner, userId]
  );

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    async function loadProfile() {
      setError("");

      if (!supabase) {
        setError("尚未設定 Supabase 環境變數，無法載入 Profile。");
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("請先登入後再編輯 Profile。");
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setIsLoading(false);
        return;
      }

      setForm({
        full_name: profile?.full_name ?? "",
        job_title: profile?.job_title ?? profile?.title ?? "",
        avatar_url: profile?.avatar_url ?? "",
        banner_url: profile?.banner_url ?? "",
        location: profile?.location ?? "",
        timezone: profile?.timezone ?? "",
        skills: joinList(profile?.skills),
        languages: joinList(profile?.languages),
        work_type: profile?.work_type ?? [],
        bio: profile?.bio ?? "",
        portfolio_url: profile?.portfolio_url ?? "",
        linkedin_url: socialValue(profile, "linkedin"),
        github_url: socialValue(profile, "github"),
        work_experience: normalizeWorkExperience(profile?.work_experience),
        education: normalizeEducation(profile?.education),
        is_public: profile?.is_public ?? false
      });
      setIsLoading(false);
    }

    loadProfile();
  }, []);

  function updateField<Key extends keyof ProfileFormState>(
    key: Key,
    value: ProfileFormState[Key]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function toggleWorkType(value: string) {
    setForm((current) => ({
      ...current,
      work_type: current.work_type.includes(value)
        ? current.work_type.filter((item) => item !== value)
        : [...current.work_type, value]
    }));
  }

  function addWorkExperience() {
    setForm((current) => ({
      ...current,
      work_experience: [...current.work_experience, createWorkExperienceItem()]
    }));
  }

  function updateWorkExperience(
    key: string,
    field: keyof Omit<WorkExperienceFormItem, "key">,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      work_experience: current.work_experience.map((item) =>
        item.key === key ? { ...item, [field]: value } : item
      )
    }));
  }

  function removeWorkExperience(key: string) {
    setForm((current) => ({
      ...current,
      work_experience: current.work_experience.filter((item) => item.key !== key)
    }));
  }

  function addEducation() {
    setForm((current) => ({
      ...current,
      education: [...current.education, createEducationItem()]
    }));
  }

  function updateEducation(
    key: string,
    field: keyof Omit<EducationFormItem, "key">,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      education: current.education.map((item) =>
        item.key === key ? { ...item, [field]: value } : item
      )
    }));
  }

  function removeEducation(key: string) {
    setForm((current) => ({
      ...current,
      education: current.education.filter((item) => item.key !== key)
    }));
  }

  async function uploadTalentAsset(file: File, folder: "avatars" | "banners") {
    if (!supabase || !userId) {
      throw new Error("請先登入後再上傳圖片。");
    }

    if (!isSupportedImage(file)) {
      throw new Error("請選擇圖片檔案。");
    }

    if (file.size > talentAssetMaxFileSize) {
      throw new Error("圖片大小不可超過 8MB。");
    }

    const extension = getFileExtension(file.name) || "jpg";
    const filePath = `${userId}/${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(talentAssetsBucket)
      .upload(filePath, file, {
        contentType: getImageContentType(file),
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(talentAssetsBucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");
    setError("");
    setIsUploadingAvatar(true);

    try {
      const publicUrl = await uploadTalentAsset(file, "avatars");
      updateField("avatar_url", publicUrl);
      setMessage("大頭照已上傳，請儲存履歷。");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "大頭照上傳失敗。");
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  }

  async function handleBannerUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");
    setError("");
    setIsUploadingBanner(true);

    try {
      const publicUrl = await uploadTalentAsset(file, "banners");
      updateField("banner_url", publicUrl);
      setMessage("個人橫幅已上傳，請儲存履歷。");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "個人橫幅上傳失敗。");
    } finally {
      setIsUploadingBanner(false);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setToast(null);

    if (!supabase || !userId) {
      const errorMessage = "請先登入後再提交 Profile。";
      setError(errorMessage);
      setToast({ type: "error", message: errorMessage });
      return;
    }

    setIsSubmitting(true);

    try {
      const social_urls: Record<string, string> = {};
      if (form.linkedin_url.trim()) {
        social_urls.linkedin = form.linkedin_url.trim();
      }
      if (form.github_url.trim()) {
        social_urls.github = form.github_url.trim();
      }

      const updatePayload: NomadProfilePayload = {
        full_name: form.full_name,
        job_title: form.job_title,
        avatar_url: form.avatar_url,
        banner_url: form.banner_url,
        location: form.location,
        timezone: form.timezone,
        skills: splitList(form.skills),
        languages: splitList(form.languages),
        work_type: form.work_type,
        bio: form.bio,
        portfolio_url: form.portfolio_url,
        work_experience: serializeWorkExperience(form.work_experience),
        education: serializeEducation(form.education),
        is_public: form.is_public,
        linkedin_url: social_urls.linkedin ?? "",
        github_url: social_urls.github ?? ""
      };

      const result = await saveNomadProfile(updatePayload);

      if (!result.ok) {
        const errorMessage = result.message || "儲存失敗，請檢查資料或稍後再試。";
        setError(errorMessage);
        setToast({ type: "error", message: errorMessage });
        return;
      }

      const successMessage = result.message || "履歷資料已成功儲存！";
      setMessage(successMessage);
      setToast({ type: "success", message: successMessage });
    } catch (submitError) {
      console.error("[profile-edit] Failed to submit profile.", submitError);
      const errorMessage = "儲存失敗，請檢查資料或稍後再試。";
      setError(errorMessage);
      setToast({ type: "error", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {toast ? (
        <div
          className={`fixed bottom-5 right-5 z-[90] flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
          role="status"
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <span>{toast.message}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-blue-600" aria-hidden="true" />
          正在載入 Profile...
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <ImageUp className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">頂部視覺</h2>
            <p className="mt-1 text-sm text-gray-500">
              大頭照與個人橫幅會用於未來的精選人才專頁。
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">大頭照 Avatar</p>
            <div
              className="mt-4 flex aspect-square items-center justify-center rounded-full bg-white bg-cover bg-center bg-no-repeat shadow-sm ring-1 ring-gray-200"
              style={form.avatar_url ? { backgroundImage: `url(${form.avatar_url})` } : undefined}
            >
              {!form.avatar_url ? (
                <Camera className="h-10 w-10 text-gray-300" aria-hidden="true" />
              ) : null}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              disabled={isUploadingAvatar || isSubmitting || !userId}
              onChange={handleAvatarUpload}
              className="mt-4 w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="mt-3 min-h-5">
              {isUploadingAvatar ? (
                <p className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  大頭照上傳中...
                </p>
              ) : form.avatar_url ? (
                <button
                  type="button"
                  onClick={() => updateField("avatar_url", "")}
                  className="text-xs font-semibold text-red-600 transition hover:text-red-700"
                >
                  移除大頭照
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">個人橫幅 Banner</p>
            <div
              className="mt-4 flex aspect-[3/1] items-center justify-center rounded-lg bg-white bg-cover bg-center bg-no-repeat shadow-sm ring-1 ring-gray-200"
              style={form.banner_url ? { backgroundImage: `url(${form.banner_url})` } : undefined}
            >
              {!form.banner_url ? (
                <UploadCloud className="h-10 w-10 text-gray-300" aria-hidden="true" />
              ) : null}
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              disabled={isUploadingBanner || isSubmitting || !userId}
              onChange={handleBannerUpload}
              className="mt-4 w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="mt-3 flex min-h-5 items-start justify-between gap-3">
              {isUploadingBanner ? (
                <p className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  個人橫幅上傳中...
                </p>
              ) : (
                <p className="min-w-0 flex-1 text-xs leading-5 text-gray-500">
                  💡 建議上傳無文字的環境照或個人風格照，推薦尺寸為 1200 x 400 像素 (比例 3:1)。
                </p>
              )}
              {form.banner_url ? (
                <button
                  type="button"
                  onClick={() => updateField("banner_url", "")}
                  className="shrink-0 text-xs font-semibold text-red-600 transition hover:text-red-700"
                >
                  移除橫幅
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
          <input
            type="checkbox"
            checked={form.is_public}
            onChange={(event) => updateField("is_public", event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-600"
          />
          <span>
            <span className="block text-sm font-semibold text-emerald-900">
              公開我的履歷
            </span>
            <span className="mt-1 block text-sm leading-6 text-emerald-800">
              開啟後，您的履歷將有機會顯示在平台前台的「精選人才列表」中，讓企業主動發現您。
            </span>
          </span>
        </label>
      </section>

      <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">基本與專業資訊</h2>
            <p className="mt-1 text-sm text-gray-500">讓合作方快速理解你的定位與可合作時區。</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-900">姓名</span>
            <input
              value={form.full_name}
              onChange={(event) => updateField("full_name", event.target.value)}
              placeholder="Name"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-900">專業頭銜</span>
            <input
              value={form.job_title}
              onChange={(event) => updateField("job_title", event.target.value)}
              placeholder="例如：資深產品設計師、全端工程師"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-900">所在地</span>
            <input
              value={form.location}
              onChange={(event) => updateField("location", event.target.value)}
              placeholder="例如：Taipei / Hong Kong"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-900">所在時區</span>
            <input
              value={form.timezone}
              onChange={(event) => updateField("timezone", event.target.value)}
              placeholder="例如：UTC+8"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">技能與合作條件</h2>
            <p className="mt-1 text-sm text-gray-500">用逗號分隔技能與語言，方便後續搜尋與媒合。</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-900">核心技能</span>
            <input
              value={form.skills}
              onChange={(event) => updateField("skills", event.target.value)}
              placeholder="例如：Next.js, Firebase, WIX, 跨國專案管理"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
            <span className="mt-2 block text-xs text-gray-500">
              以半形逗號 (,) 分隔多個技能。
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-900">工作語言</span>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
              <Languages className="h-4 w-4 text-gray-400" aria-hidden="true" />
              <input
                value={form.languages}
                onChange={(event) => updateField("languages", event.target.value)}
                placeholder="例如：中文, English, 日本語"
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </div>
          </label>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-gray-900">偏好工作型態</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {workTypeOptions.map((option) => {
              const checked = form.work_type.includes(option);

              return (
                <label
                  key={option}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    checked
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-100 hover:text-blue-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleWorkType(option)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  {option}
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <Globe2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">詳細介紹與連結</h2>
            <p className="mt-1 text-sm text-gray-500">補上作品集與社群連結，降低合作方的評估成本。</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5">
          <label className="block">
            <span className="text-sm font-medium text-gray-900">自我介紹</span>
            <textarea
              rows={6}
              value={form.bio}
              onChange={(event) => updateField("bio", event.target.value)}
              placeholder="請描述過往專案、合作風格、擅長解決的問題，以及你偏好的遠端協作方式。"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-900">作品集連結</span>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                <LinkIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                <input
                  type="url"
                  value={form.portfolio_url}
                  onChange={(event) => updateField("portfolio_url", event.target.value)}
                  placeholder="https://your-site.com"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-900">LinkedIn 連結</span>
              <input
                type="url"
                value={form.linkedin_url}
                onChange={(event) => updateField("linkedin_url", event.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block md:col-start-2">
              <span className="text-sm font-medium text-gray-900">GitHub 連結</span>
              <input
                type="url"
                value={form.github_url}
                onChange={(event) => updateField("github_url", event.target.value)}
                placeholder="https://github.com/..."
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">過往工作經驗</h2>
              <p className="mt-1 text-sm text-gray-500">
                以結構化方式呈現公司、專案、職稱與具體成果。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={addWorkExperience}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            新增工作經驗
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {form.work_experience.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-900">尚未新增工作經驗</p>
              <p className="mt-1 text-sm text-gray-500">
                建議加入 1-3 筆最能代表遠端合作能力的專案或職務。
              </p>
            </div>
          ) : null}

          {form.work_experience.map((experience, index) => (
            <div
              key={experience.key}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  工作經驗 {index + 1}
                </h3>
                <button
                  type="button"
                  onClick={() => removeWorkExperience(experience.key)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-white hover:text-red-600"
                  aria-label={`刪除工作經驗 ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  刪除
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-900">
                    公司/專案名稱
                  </span>
                  <input
                    value={experience.company}
                    onChange={(event) =>
                      updateWorkExperience(experience.key, "company", event.target.value)
                    }
                    placeholder="例如「臺北醫學大學國際事務處」或「ON-GO Travel」"
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-900">職稱</span>
                  <input
                    value={experience.job_title}
                    onChange={(event) =>
                      updateWorkExperience(experience.key, "job_title", event.target.value)
                    }
                    placeholder="例如「Project Manager」"
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-900">開始日期</span>
                  <input
                    type="month"
                    value={experience.start_date}
                    onChange={(event) =>
                      updateWorkExperience(experience.key, "start_date", event.target.value)
                    }
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-900">結束日期</span>
                  <input
                    type="month"
                    value={experience.end_date}
                    onChange={(event) =>
                      updateWorkExperience(experience.key, "end_date", event.target.value)
                    }
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="mt-1 block text-xs text-gray-500">
                    留空代表至今
                  </span>
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-gray-900">工作內容描述</span>
                  <textarea
                    rows={4}
                    value={experience.description}
                    onChange={(event) =>
                      updateWorkExperience(experience.key, "description", event.target.value)
                    }
                    placeholder="例如「負責旅遊平台 TADAGO 數位基礎設施建設 (Next.js, Firebase) 與跨國專案管理。」"
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">學歷背景</h2>
              <p className="mt-1 text-sm text-gray-500">
                補充學校、學位與畢業年份，讓履歷資訊更完整。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={addEducation}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            新增學歷
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {form.education.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-900">尚未新增學歷</p>
              <p className="mt-1 text-sm text-gray-500">
                可加入最高學歷或與目前專業最相關的訓練背景。
              </p>
            </div>
          ) : null}

          {form.education.map((education, index) => (
            <div
              key={education.key}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  學歷 {index + 1}
                </h3>
                <button
                  type="button"
                  onClick={() => removeEducation(education.key)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-white hover:text-red-600"
                  aria-label={`刪除學歷 ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  刪除
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px]">
                <label className="block">
                  <span className="text-sm font-medium text-gray-900">
                    學校名稱
                  </span>
                  <input
                    value={education.school}
                    onChange={(event) =>
                      updateEducation(education.key, "school", event.target.value)
                    }
                    placeholder="School / University"
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-900">
                    學位與科系
                  </span>
                  <input
                    value={education.degree}
                    onChange={(event) =>
                      updateEducation(education.key, "degree", event.target.value)
                    }
                    placeholder="例如「Master's Degree」"
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-900">
                    畢業年份
                  </span>
                  <input
                    inputMode="numeric"
                    value={education.graduation_year}
                    onChange={(event) =>
                      updateEducation(education.key, "graduation_year", event.target.value)
                    }
                    placeholder="例如「2023」"
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          {isSubmitting ? "儲存中..." : "儲存 Profile"}
        </button>
      </div>
    </form>
  );
}
