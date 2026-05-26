import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createStripeClient } from "@/lib/stripe";
import { getPromotionPlan } from "@/lib/pricing";

export const runtime = "nodejs";

// Required in .env.local:
// STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY,
// NEXT_PUBLIC_APP_URL, RESEND_API_KEY, RESEND_FROM_EMAIL, CRON_SECRET.
type CheckoutRequest = {
  planId?: string;
};

type CheckoutLineItem =
  | {
      price: string;
      quantity: number;
    }
  | {
      price_data: {
        currency: string;
        product_data: {
          name: string;
        };
        unit_amount: number;
      };
      quantity: number;
    };

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseAdminClient();
  const stripe = createStripeClient();

  if (!supabase || !supabaseAdmin || !stripe) {
    return NextResponse.json(
      { error: "Missing Supabase service role or Stripe environment variables." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as CheckoutRequest;
  const plan = getPromotionPlan(body.planId);

  if (!plan) {
    return NextResponse.json({ error: "Invalid pricing plan." }, { status: 400 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Please sign in before upgrading." }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id,stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const currency = process.env.STRIPE_CURRENCY ?? "twd";
  const priceId = process.env[plan.stripePriceEnv];

  const lineItem: CheckoutLineItem = priceId
    ? {
        price: priceId,
        quantity: 1
      }
    : {
        price_data: {
          currency,
          product_data: {
            name: `NOMAD-GO ${plan.name}`
          },
          unit_amount: plan.amount
        },
        quantity: 1
      };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: profile.stripe_customer_id ?? undefined,
    customer_email: profile.stripe_customer_id ? undefined : user.email,
    line_items: [lineItem],
    success_url: `${appUrl}/talent?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled`,
    metadata: {
      user_id: user.id,
      plan_id: plan.id,
      duration_days: String(plan.durationDays)
    }
  });

  const { error: orderError } = await supabaseAdmin.from("orders").insert({
    user_id: user.id,
    stripe_session_id: session.id,
    amount: plan.amount,
    status: "pending"
  });

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
