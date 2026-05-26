import { NextResponse } from "next/server";
import { createResendClient, getEmailFrom } from "@/lib/resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

function escapeHtml(value: string | null | undefined) {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");

  return Boolean(secret && header === `Bearer ${secret}`);
}

function buildNewsletterHtml(profiles: Profile[]) {
  const cards = profiles
    .map(
      (profile) => `
        <tr>
          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #111827;">${escapeHtml(profile.full_name ?? "NOMAD-GO Talent")}</div>
            <div style="color: #2563eb; margin-top: 4px;">${escapeHtml(profile.title ?? "遠端工作人才")}</div>
            <div style="color: #4b5563; margin-top: 8px;">${escapeHtml(profile.bio)}</div>
            <div style="color: #6b7280; margin-top: 8px;">${escapeHtml(profile.location ?? "Remote")} · ${escapeHtml(profile.timezone ?? "Flexible")}</div>
          </td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.7;">
      <h1 style="font-size: 24px;">NOMAD-GO 本週精選遠端人才</h1>
      <p style="color: #4b5563;">以下人才目前正在精選曝光期，適合遠端合作、專案接案與跨時區團隊。</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        ${cards}
      </table>
    </div>
  `;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const resend = createResendClient();

  if (!supabaseAdmin || !resend) {
    return NextResponse.json(
      { error: "Missing Supabase service role or Resend configuration." },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const { data: vipProfiles, error: vipError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("account_type", "nomad")
    .gt("sponsored_until", now)
    .order("sponsored_until", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (vipError) {
    return NextResponse.json({ error: vipError.message }, { status: 500 });
  }

  if (!vipProfiles?.length) {
    return NextResponse.json({ sent: 0, reason: "No active sponsored profiles." });
  }

  const { data: employers, error: employerError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("account_type", "employer");

  if (employerError) {
    return NextResponse.json({ error: employerError.message }, { status: 500 });
  }

  const recipients: string[] = [];

  for (const employer of employers ?? []) {
    const {
      data: { user }
    } = await supabaseAdmin.auth.admin.getUserById(employer.id);

    if (user?.email) {
      recipients.push(user.email);
    }
  }

  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, reason: "No employer recipients." });
  }

  const html = buildNewsletterHtml(vipProfiles);

  await Promise.all(
    recipients.map((recipient) =>
      resend.emails.send({
        from: getEmailFrom(),
        to: recipient,
        subject: "NOMAD-GO 本週精選遠端人才",
        html
      })
    )
  );

  return NextResponse.json({
    sent: recipients.length,
    profiles: vipProfiles.length
  });
}
