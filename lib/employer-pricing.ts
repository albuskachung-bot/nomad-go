import type { CompanySubscriptionPlan } from "@/lib/types";

export type EmployerCheckoutPlanId = Exclude<CompanySubscriptionPlan, "free">;

export type EmployerCheckoutPlan = {
  id: EmployerCheckoutPlanId;
  name: string;
  amount: number;
  durationDays: number;
  stripePriceEnv: "STRIPE_COMPANY_PRO_PRICE_ID" | "STRIPE_COMPANY_BOOST_PRICE_ID";
};

export const employerCheckoutPlans: Record<EmployerCheckoutPlanId, EmployerCheckoutPlan> = {
  pro: {
    id: "pro",
    name: "企業 Pro 方案",
    amount: 9900,
    durationDays: 30,
    stripePriceEnv: "STRIPE_COMPANY_PRO_PRICE_ID"
  },
  boost: {
    id: "boost",
    name: "企業 Boost 方案",
    amount: 4900,
    durationDays: 30,
    stripePriceEnv: "STRIPE_COMPANY_BOOST_PRICE_ID"
  }
};

export function getEmployerCheckoutPlan(planId: string | null | undefined) {
  if (planId === "pro" || planId === "boost") {
    return employerCheckoutPlans[planId];
  }

  return null;
}
