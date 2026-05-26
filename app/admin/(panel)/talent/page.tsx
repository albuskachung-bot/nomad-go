import AdminContentTable, { type AdminContentRow } from "@/components/admin/AdminContentTable";
import { getCurrentAdminContext } from "@/lib/admin";
import { mockTalentProfiles } from "@/lib/data";
import type { Profile } from "@/lib/types";

function toRow(profile: Profile): AdminContentRow {
  return {
    id: profile.id,
    title: profile.full_name ?? "未命名人才",
    subtitle: profile.title ?? profile.location ?? "Remote talent",
    submittedAt: profile.updated_at ?? profile.created_at,
    status: profile.status,
    isFeatured: profile.is_featured
  };
}

export default async function AdminTalentPage() {
  const { supabase } = await getCurrentAdminContext();
  let profiles = mockTalentProfiles;

  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("account_type", "nomad")
      .order("updated_at", { ascending: false });

    profiles = data ?? mockTalentProfiles;
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Talent
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-gray-900">
          人才庫管理
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          審核人才履歷，並控制是否進入首頁與人才列表精選曝光。
        </p>
      </section>

      <AdminContentTable
        table="profiles"
        rows={profiles.map(toRow)}
        titleHeader="人才"
        subtitleHeader="專業定位"
      />
    </div>
  );
}
