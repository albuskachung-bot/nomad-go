import AdminContentTable, { type AdminContentRow } from "@/components/admin/AdminContentTable";
import { getCurrentAdminContext } from "@/lib/admin";
import { mockGuides } from "@/lib/data";
import type { Guide } from "@/lib/types";

function toRow(guide: Guide): AdminContentRow {
  return {
    id: guide.id,
    title: guide.city,
    subtitle: `${guide.country} · ${guide.region}`,
    submittedAt: guide.created_at,
    status: guide.status,
    isFeatured: guide.is_featured
  };
}

export default async function AdminGuidesPage() {
  const { supabase } = await getCurrentAdminContext();
  let guides = mockGuides;

  if (supabase) {
    const { data } = await supabase
      .from("guides")
      .select("*")
      .order("created_at", { ascending: false });

    guides = data ?? mockGuides;
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Guides
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-gray-900">
          城市指南管理
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          管理城市指南發布狀態與首頁精選曝光。
        </p>
      </section>

      <AdminContentTable
        table="guides"
        rows={guides.map(toRow)}
        titleHeader="城市"
        subtitleHeader="國家與區域"
      />
    </div>
  );
}
