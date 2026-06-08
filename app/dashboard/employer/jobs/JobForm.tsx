import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, Save } from "lucide-react";

export type JobFormValues = {
  title?: string | null;
  job_type?: string | null;
  work_type?: string | null;
  location?: string | null;
  salary_min?: number | string | null;
  salary_max?: number | string | null;
  salary_currency?: string | null;
  description?: string | null;
  requirements?: string | null;
  benefits?: string | null;
  status?: string | null;
};

type JobFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: JobFormValues | null;
  error?: string | null;
  mode: "create" | "edit";
};

const jobTypes = [
  { value: "full_time", label: "全職" },
  { value: "part_time", label: "兼職" },
  { value: "contract", label: "約聘" },
  { value: "freelance", label: "接案" },
  { value: "internship", label: "實習" }
];

const workTypes = [
  { value: "remote", label: "遠端" },
  { value: "hybrid", label: "混合" },
  { value: "onsite", label: "現場" }
];

const currencies = ["TWD", "USD", "JPY", "HKD", "SGD"];

function getTextValue(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  return String(value);
}

export default function JobForm({
  action,
  defaultValues,
  error,
  mode
}: JobFormProps) {
  const isEditing = mode === "edit";
  const status = defaultValues?.status ?? (isEditing ? "pending" : "pending");

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard/employer/jobs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回職缺管理
          </Link>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-cyan-700">
            {isEditing ? "Edit Job" : "Create Job"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            {isEditing ? "編輯職缺" : "發布新職缺"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            {isEditing
              ? "更新職缺資訊後，會回到職缺列表供你管理上下架狀態。"
              : "填寫職缺基本資訊。送出後預設進入審核中狀態。"}
          </p>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      <form
        action={action}
        className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"
      >
        <input type="hidden" name="status" value={status} />

        <div className="flex items-center gap-2 border-b border-slate-200 pb-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
            <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-950">職缺內容</h2>
            <p className="mt-1 text-sm text-slate-500">
              清楚描述工作內容、型態與薪資範圍。
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">職缺名稱</span>
            <input
              name="title"
              required
              defaultValue={getTextValue(defaultValues?.title)}
              placeholder="Senior Frontend Engineer"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">工作類型</span>
            <select
              name="job_type"
              defaultValue={getTextValue(defaultValues?.job_type) || "full_time"}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              {jobTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">工作型態</span>
            <select
              name="work_type"
              defaultValue={getTextValue(defaultValues?.work_type) || "remote"}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              {workTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">工作地點</span>
            <input
              name="location"
              defaultValue={getTextValue(defaultValues?.location)}
              placeholder="Taipei / Remote"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">最低薪資</span>
            <input
              name="salary_min"
              type="number"
              min="0"
              defaultValue={getTextValue(defaultValues?.salary_min)}
              placeholder="80000"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">最高薪資</span>
            <input
              name="salary_max"
              type="number"
              min="0"
              defaultValue={getTextValue(defaultValues?.salary_max)}
              placeholder="120000"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">幣別</span>
            <select
              name="salary_currency"
              defaultValue={
                getTextValue(defaultValues?.salary_currency) || currencies[0]
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">職缺描述</span>
            <textarea
              name="description"
              required
              rows={8}
              defaultValue={getTextValue(defaultValues?.description)}
              placeholder="描述工作內容、團隊合作方式與期待成果。"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-7 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">必要條件</span>
            <textarea
              name="requirements"
              rows={5}
              defaultValue={getTextValue(defaultValues?.requirements)}
              placeholder="列出技能、年資、語言或遠端合作要求。"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-7 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">福利亮點</span>
            <textarea
              name="benefits"
              rows={5}
              defaultValue={getTextValue(defaultValues?.benefits)}
              placeholder="例如遠端補助、彈性工時、年度旅居預算。"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-7 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/employer/jobs"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            取消
          </Link>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isEditing ? "儲存變更" : "送出審核"}
          </button>
        </div>
      </form>
    </div>
  );
}
