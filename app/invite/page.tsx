import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, Clock3, ShieldAlert, UsersRound } from "lucide-react";
import InviteAcceptPanel from "@/components/invite/InviteAcceptPanel";
import InviteLoginPanel from "@/components/invite/InviteLoginPanel";
import { getWorkspaceErrorMessage } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompanyInviteLookup } from "@/lib/types";

type InvitePageProps = {
  searchParams?: Promise<{
    token?: string | string[];
  }>;
};

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const params = searchParams ? await searchParams : {};
  const token = readParam(params.token)?.trim() ?? "";

  if (!token) {
    return (
      <InviteShell>
        <InviteStateCard
          tone="error"
          title="缺少邀請 token"
          description="請確認邀請連結完整，或請公司 Admin 重新產生邀請。"
        />
      </InviteShell>
    );
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <InviteShell>
        <InviteStateCard
          tone="error"
          title="系統尚未連線"
          description="尚未設定 Supabase 環境變數，無法驗證邀請。"
        />
      </InviteShell>
    );
  }

  const { data: inviteRows, error: inviteError } = await supabase.rpc("get_company_invite_by_token", {
    target_token: token
  });

  if (inviteError) {
    return (
      <InviteShell>
        <InviteStateCard
          tone="error"
          title="邀請驗證失敗"
          description={getWorkspaceErrorMessage(inviteError)}
        />
      </InviteShell>
    );
  }

  const invite = ((inviteRows ?? []) as CompanyInviteLookup[])[0] ?? null;

  if (!invite) {
    return (
      <InviteShell>
        <InviteStateCard
          tone="error"
          title="找不到邀請"
          description="此邀請可能不存在，或 token 已被重新產生。"
        />
      </InviteShell>
    );
  }

  if (invite.status !== "pending") {
    return (
      <InviteShell>
        <InviteStateCard
          tone="success"
          title="邀請已被接受"
          description="這張邀請票券已完成加入流程。你可以直接前往企業雇主中心。"
          actionHref="/employer/dashboard"
          actionLabel="前往雇主中心"
        />
      </InviteShell>
    );
  }

  if (invite.is_expired) {
    return (
      <InviteShell>
        <InviteStateCard
          tone="error"
          title="邀請已過期"
          description="此邀請已超過有效期限，請公司 Admin 重新產生邀請。"
        />
      </InviteShell>
    );
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const currentEmail = user?.email?.toLowerCase() ?? null;
  const invitedEmail = invite.email?.toLowerCase() ?? null;
  const hasEmailMismatch = Boolean(user && invitedEmail && currentEmail !== invitedEmail);

  return (
    <InviteShell>
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <UsersRound className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Workspace Invite
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
              加入 {invite.company_name} 團隊
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              接受後，你會以 Recruiter 權限加入企業雇主中心，可以協同管理職缺與應徵者流程。
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex items-center justify-between gap-4">
            <span>邀請狀態</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Pending
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>有效期限</span>
            <span className="inline-flex items-center gap-1 font-medium text-slate-900">
              <Clock3 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              {new Intl.DateTimeFormat("zh-TW", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              }).format(new Date(invite.expires_at))}
            </span>
          </div>
          {invite.email ? (
            <div className="flex items-center justify-between gap-4">
              <span>指定信箱</span>
              <span className="font-medium text-slate-900">{invite.email}</span>
            </div>
          ) : null}
        </div>

        {!user ? (
          <>
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              請先登入或註冊。登入成功後會回到此邀請頁，確認後即可加入團隊。
            </div>
            <InviteLoginPanel token={token} invitedEmail={invite.email} />
          </>
        ) : hasEmailMismatch ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
            這張邀請指定給 {invite.email}，但你目前登入的是 {user.email}。請切換帳號後再接受邀請。
          </div>
        ) : (
          <InviteAcceptPanel token={token} />
        )}
      </section>
    </InviteShell>
  );
}

function InviteShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-lg font-semibold tracking-normal text-slate-950">
          NOMAD-GO
        </Link>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

function InviteStateCard({
  tone,
  title,
  description,
  actionHref,
  actionLabel
}: {
  tone: "success" | "error";
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  const Icon = tone === "success" ? CheckCircle2 : ShieldAlert;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
          tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
        }`}
      >
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-normal text-slate-950">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
