import Link from "next/link";
import type { ReactNode } from "react";
import { Building2, ShieldAlert } from "lucide-react";
import EmployerTeamClient, { type EmployerTeamMemberRow } from "@/app/employer/components/EmployerTeamClient";
import { getEmployerWorkspaceContext, getWorkspaceErrorMessage } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompanyTeamMember } from "@/lib/types";

function normalizeMember(row: CompanyTeamMember): EmployerTeamMemberRow {
  const email = row.email ?? "email unavailable";
  const name = row.full_name?.trim() || email.split("@")[0] || "Team member";

  return {
    userId: row.user_id,
    email,
    name,
    avatarUrl: row.avatar_url,
    role: row.role,
    joinedAt: row.created_at
  };
}

export default async function EmployerTeamPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <TeamShell>
        <UnavailableCard message="尚未設定 Supabase 環境變數，無法讀取團隊資料。" />
      </TeamShell>
    );
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return (
      <TeamShell>
        <UnavailableCard message="請先登入企業雇主中心，再管理團隊成員。" />
      </TeamShell>
    );
  }

  const workspace = await getEmployerWorkspaceContext(supabase, user.id);

  if (workspace.error) {
    return (
      <TeamShell>
        <UnavailableCard message={workspace.error} />
      </TeamShell>
    );
  }

  if (!workspace.context?.company) {
    return (
      <TeamShell>
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">尚未建立公司 Workspace</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                團隊管理需要先有公司品牌資料。建立公司後，系統會自動將 owner 加入為 Admin。
              </p>
              <Link
                href="/employer/company"
                className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                建立公司資料
              </Link>
            </div>
          </div>
        </section>
      </TeamShell>
    );
  }

  let members: EmployerTeamMemberRow[] = [];
  let dataError: string | null = null;

  const { data, error } = await supabase.rpc("get_company_team_members", {
    target_company_id: workspace.context.company.id
  });

  if (error) {
    dataError = getWorkspaceErrorMessage(error);
  } else {
    members = ((data ?? []) as CompanyTeamMember[]).map(normalizeMember);
  }

  return (
    <TeamShell>
      <EmployerTeamClient
        companyName={workspace.context.company.name}
        canManageTeam={workspace.context.canManageTeam}
        members={members}
        dataError={dataError}
      />
    </TeamShell>
  );
}

function TeamShell({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Team Workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">團隊管理</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          管理企業內部招募成員，並透過邀請連結或 Email 邀請新人加入協同作業。
        </p>
      </section>
      {children}
    </div>
  );
}

function UnavailableCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">團隊管理暫時無法載入</p>
          <p className="mt-1">{message}</p>
        </div>
      </div>
    </div>
  );
}
