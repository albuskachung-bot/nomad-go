import { Check, Star, X } from "lucide-react";
import { updateCurationItem } from "@/app/admin/actions";
import { getCurrentAdminContext } from "@/lib/admin";
import { mockGuides, mockJobs, mockTalents } from "@/lib/data";
import type { ContentStatus, Guide, Job, Talent } from "@/lib/types";

type CurationRow = {
  id: string;
  title: string;
  subtitle: string;
  is_featured: boolean;
  status: ContentStatus;
};

function statusLabel(status: ContentStatus) {
  return {
    pending: "待審核",
    published: "已發布",
    rejected: "已拒絕"
  }[status];
}

function toJobRow(job: Job): CurationRow {
  return {
    id: job.id,
    title: job.title,
    subtitle: `${job.company} · ${job.location}`,
    is_featured: job.is_featured,
    status: job.status
  };
}

function toGuideRow(guide: Guide): CurationRow {
  return {
    id: guide.id,
    title: guide.city,
    subtitle: `${guide.country} · ${guide.region}`,
    is_featured: guide.is_featured,
    status: guide.status
  };
}

function toTalentRow(talent: Talent): CurationRow {
  return {
    id: talent.id,
    title: talent.headline,
    subtitle: talent.location ?? "Remote",
    is_featured: talent.is_featured,
    status: talent.status
  };
}

function CurationTable({
  title,
  table,
  rows
}: {
  title: string;
  table: "jobs" | "guides" | "talents";
  rows: CurationRow[];
}) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="py-3 pr-4">項目</th>
              <th className="px-4 py-3">首頁精選</th>
              <th className="px-4 py-3">審核狀態</th>
              <th className="py-3 pl-4">審核操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-4 pr-4">
                  <div className="font-semibold text-gray-900">{row.title}</div>
                  <div className="mt-1 text-gray-500">{row.subtitle}</div>
                </td>
                <td className="px-4 py-4">
                  <form action={updateCurationItem}>
                    <input type="hidden" name="table" value={table} />
                    <input type="hidden" name="id" value={row.id} />
                    <input
                      type="hidden"
                      name="next_featured"
                      value={row.is_featured ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 ${
                        row.is_featured
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden="true" />
                      {row.is_featured ? "顯示中" : "未精選"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600">
                    {statusLabel(row.status)}
                  </span>
                </td>
                <td className="py-4 pl-4">
                  <div className="flex flex-wrap gap-2">
                    <form action={updateCurationItem}>
                      <input type="hidden" name="table" value={table} />
                      <input type="hidden" name="id" value={row.id} />
                      <button
                        type="submit"
                        name="next_status"
                        value="published"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:shadow-sm"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        通過
                      </button>
                    </form>
                    <form action={updateCurationItem}>
                      <input type="hidden" name="table" value={table} />
                      <input type="hidden" name="id" value={row.id} />
                      <button
                        type="submit"
                        name="next_status"
                        value="rejected"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:shadow-sm"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        拒絕
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function AdminCurationPage() {
  const { supabase } = await getCurrentAdminContext();
  let jobs: Job[] = mockJobs;
  let guides: Guide[] = mockGuides;
  let talents: Talent[] = mockTalents;

  if (supabase) {
    const [jobsResult, guidesResult, talentsResult] = await Promise.all([
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("guides").select("*").order("created_at", { ascending: false }),
      supabase.from("talents").select("*").order("created_at", { ascending: false })
    ]);

    jobs = jobsResult.data ?? mockJobs;
    guides = guidesResult.data ?? mockGuides;
    talents = talentsResult.data ?? mockTalents;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Curation
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-gray-900">
          首頁策展控制
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          管理 `is_featured` 與 `status`，控制哪些項目可以出現在首頁與公開列表。
        </p>
      </section>

      <CurationTable title="職缺" table="jobs" rows={jobs.map(toJobRow)} />
      <CurationTable title="城市指南" table="guides" rows={guides.map(toGuideRow)} />
      <CurationTable title="人才履歷" table="talents" rows={talents.map(toTalentRow)} />
    </div>
  );
}
