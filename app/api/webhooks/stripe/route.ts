import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createResendClient, getEmailFrom } from "@/lib/resend";
import { getEmployerCheckoutPlan } from "@/lib/employer-pricing";
import { getPromotionPlan } from "@/lib/pricing";
import { createStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function buildUpgradeEmail(planName: string, sponsoredUntil: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.7;">
      <h1 style="font-size: 22px;">NOMAD-GO 付費置頂已啟用</h1>
      <p>你的 ${planName} 已付款成功，人才 Profile 已進入精選曝光排序。</p>
      <p><strong>有效期限：</strong>${new Date(sponsoredUntil).toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei"
      })}</p>
      <p style="color: #4b5563;">你可以回到人才頁確認「精選」標籤與置頂排序效果。</p>
    </div>
  `;
}

function buildCompanyUpgradeEmail(planName: string, companyName: string, planExpiresAt: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.7;">
      <h1 style="font-size: 22px;">NOMAD-GO 企業方案已啟用</h1>
      <p>${companyName} 的 ${planName} 已付款成功，企業招募權限已更新。</p>
      <p><strong>有效期限：</strong>${new Date(planExpiresAt).toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei"
      })}</p>
      <p style="color: #4b5563;">你可以回到企業 Billing 頁確認目前方案狀態。</p>
    </div>
  `;
}

async function handleCompanySubscriptionCheckout(
  session: Stripe.Checkout.Session,
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
) {
  const userId = session.metadata?.user_id;
  const companyId = session.metadata?.company_id;
  const plan = getEmployerCheckoutPlan(session.metadata?.company_plan);

  if (!userId || !companyId || !plan) {
    return NextResponse.json({ error: "Missing company checkout metadata." }, { status: 400 });
  }

  const { data: existingOrder } = await supabaseAdmin
    .from("orders")
    .select("status")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existingOrder?.status === "paid") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("id,name,plan_expires_at")
    .eq("id", companyId)
    .maybeSingle();

  if (!company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const existingUntil = company.plan_expires_at ? new Date(company.plan_expires_at) : null;
  const baseDate = existingUntil && existingUntil > new Date() ? existingUntil : new Date();
  const planExpiresAt = addDays(baseDate, plan.durationDays).toISOString();

  const { error: companyError } = await supabaseAdmin
    .from("companies")
    .update({
      subscription_plan: plan.id,
      plan_expires_at: planExpiresAt
    })
    .eq("id", companyId);

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  const { error: orderError } = await supabaseAdmin
    .from("orders")
    .upsert(
      {
        user_id: userId,
        stripe_session_id: session.id,
        amount: session.amount_total ?? plan.amount,
        status: "paid"
      },
      {
        onConflict: "stripe_session_id"
      }
    );

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  const {
    data: { user }
  } = await supabaseAdmin.auth.admin.getUserById(userId);
  const recipient = session.customer_details?.email ?? user?.email;
  const resend = createResendClient();

  if (resend && recipient) {
    try {
      await resend.emails.send({
        from: getEmailFrom(),
        to: recipient,
        subject: "NOMAD-GO 企業方案已啟用",
        html: buildCompanyUpgradeEmail(plan.name, company.name, planExpiresAt)
      });
    } catch (error) {
      console.error("Failed to send company upgrade email:", error);
    }
  }

  return NextResponse.json({ received: true });
}

export async function POST(request: Request) {
  const stripe = createStripeClient();
  const supabaseAdmin = createSupabaseAdminClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !supabaseAdmin || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing Stripe webhook or Supabase service role configuration." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.metadata?.checkout_type === "company_subscription") {
    return handleCompanySubscriptionCheckout(session, supabaseAdmin);
  }

  const userId = session.metadata?.user_id;
  const plan = getPromotionPlan(session.metadata?.plan_id);

  if (!userId || !plan) {
    return NextResponse.json({ error: "Missing checkout metadata." }, { status: 400 });
  }

  const { data: existingOrder } = await supabaseAdmin
    .from("orders")
    .select("status")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existingOrder?.status === "paid") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id,sponsored_until")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const existingUntil = profile.sponsored_until
    ? new Date(profile.sponsored_until)
    : null;
  const baseDate = existingUntil && existingUntil > new Date() ? existingUntil : new Date();
  const sponsoredUntil = addDays(baseDate, plan.durationDays).toISOString();
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;

  const { error: orderError } = await supabaseAdmin
    .from("orders")
    .upsert(
      {
        user_id: userId,
        stripe_session_id: session.id,
        amount: session.amount_total ?? plan.amount,
        status: "paid"
      },
      {
        onConflict: "stripe_session_id"
      }
    );

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      sponsored_until: sponsoredUntil,
      stripe_customer_id: stripeCustomerId
    })
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const {
    data: { user }
  } = await supabaseAdmin.auth.admin.getUserById(userId);
  const recipient = session.customer_details?.email ?? user?.email;
  const resend = createResendClient();

  if (resend && recipient) {
    try {
      await resend.emails.send({
        from: getEmailFrom(),
        to: recipient,
        subject: "NOMAD-GO 付費置頂已啟用",
        html: buildUpgradeEmail(plan.name, sponsoredUntil)
      });
    } catch (error) {
      console.error("Failed to send upgrade email:", error);
    }
  }

  return NextResponse.json({ received: true });
}
