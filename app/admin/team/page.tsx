import { ShieldAlert, UserCog } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import TeamManagementClient, {
  type TeamMemberRow
} from "@/components/admin/TeamManagementClient";
import { adminRoles } from "@/lib/admin-auth";
import { getCurrentAdminContext } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProfileRole } from "@/lib/types";

type AdminProfileRow = {
  id: string;
  role: ProfileRole;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

function readUserName(authUser: User | undefined, fallback: string | null) {
  const metadata = authUser?.user_metadata ?? {};
  const metadataName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null;

  return fallback?.trim() || metadataName?.trim() || authUser?.email || "未命名管理員";
}

function readAvatarUrl(authUser: User | undefined, fallback: string | null) {
  const metadata = authUser?.user_metadata ?? {};

  if (fallback) {
    return fallback;
  }

  return typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;
}

async function getAuthUsersById() {
  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    return {
      usersById: new Map<string, User>(),
      warning:
        "尚未設定 SUPABASE_SERVICE_ROLE_KEY，因此列表中的其他管理員 Email 可能無法完整顯示；角色更新仍會透過目前登入的 super_admin session 執行。"
    };
  }

  const { data, error } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (error) {
    return {
      usersById: new Map<string, User>(),
      warning: `Auth 使用者清單讀取失敗：${error.message}`
    };
  }

  return {
    usersById: new Map((data.users ?? []).map((user) => [user.id, user])),
    warning: null
  };
}

export default async function AdminTeamPage() {
  const { supabase, user, profile, isSuperAdmin } = await getCurrentAdminContext();

  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-amber-50 p-2 text-amber-700">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Super Admin Required
            </p>
            <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
              無法存取權限與團隊
            </h1>
          </div>
        </div>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-500">
          只有 super_admin 可以新增、移除或變更後台人員角色。你目前的角色是{" "}
          <span className="font-semibold text-slate-800">{profile?.role ?? "unknown"}</span>。
        </p>
      </div>
    );
  }

  let members: TeamMemberRow[] = [];
  let dataError: string | null = null;
  const { usersById, warning: serviceRoleWarning } = await getAuthUsersById();

  if (!supabase) {
    dataError = "尚未設定 Supabase 環境變數，無法讀取後台人員資料。";
  } else {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, full_name, avatar_url, created_at")
      .in("role", [...adminRoles])
      .order("created_at", { ascending: false });

    if (error) {
      dataError = error.message;
    } else {
      members = ((data ?? []) as AdminProfileRow[]).map((adminProfile) => {
        const authUser = usersById.get(adminProfile.id);

        return {
          id: adminProfile.id,
          email:
            authUser?.email ??
            (adminProfile.id === user?.id ? user.email ?? "Email unavailable" : "需要 service role 顯示 Email"),
          name: readUserName(authUser, adminProfile.full_name),
          role: adminProfile.role,
          joinedAt: authUser?.created_at ?? adminProfile.created_at,
          avatarUrl: readAvatarUrl(authUser, adminProfile.avatar_url),
          isSelf: adminProfile.id === user?.id
        };
      });
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Team & Roles
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            後台人員權限管理
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            以 profiles.role 作為 RBAC 權限來源，支援 super_admin、editor、reviewer 與 member。
          </p>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
          <UserCog className="h-4 w-4 text-cyan-700" aria-hidden="true" />
          Role-based access control
        </div>
      </section>

      <TeamManagementClient
        members={members}
        serviceRoleWarning={serviceRoleWarning}
        dataError={dataError}
      />
    </div>
  );
}
