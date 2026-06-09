import { NextResponse } from "next/server";
import { getEmployerWorkspaceContext } from "@/lib/employer-workspace";
import { getEmployerCheckoutPlan } from "@/lib/employer-pricing";
import { createStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type EmployerCheckoutRequest = {
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

  const body = (await request.json().catch(() => ({}))) as EmployerCheckoutRequest;
  const plan = getEmployerCheckoutPlan(body.planId);

  if (!plan) {
    return NextResponse.json({ error: "Invalid employer pricing plan." }, { status: 400 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Please sign in before upgrading." }, { status: 401 });
  }

  const workspace = await getEmployerWorkspaceContext(supabase, user.id);

  if (workspace.error) {
    return NextResponse.json({ error: workspace.error }, { status: 400 });
  }

  if (!workspace.context?.company) {
    return NextResponse.json(
      { error: "Please create a company workspace before upgrading." },
      { status: 400 }
    );
  }

  if ((workspace.context.company.subscription_plan ?? "free") === plan.id) {
    return NextResponse.json({ error: `Already on ${plan.name}.` }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const currency = process.env.STRIPE_COMPANY_CURRENCY ?? process.env.STRIPE_CURRENCY ?? "usd";
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
    customer_email: user.email,
    line_items: [lineItem],
    success_url: `${appUrl}/dashboard/employer/billing?checkout=success`,
    cancel_url: `${appUrl}/dashboard/employer/billing?checkout=cancelled`,
    metadata: {
      checkout_type: "company_subscription",
      company_id: workspace.context.company.id,
      company_plan: plan.id,
      duration_days: String(plan.durationDays),
      user_id: user.id
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
