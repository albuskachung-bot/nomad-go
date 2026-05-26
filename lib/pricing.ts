export type PromotionPlanId = "weekly" | "monthly";

export type PromotionPlan = {
  id: PromotionPlanId;
  name: string;
  priceLabel: string;
  amount: number;
  durationDays: number;
  stripePriceEnv: "STRIPE_WEEKLY_PRICE_ID" | "STRIPE_MONTHLY_PRICE_ID";
  popular?: boolean;
  benefits: string[];
};

export const promotionPlans: Record<PromotionPlanId, PromotionPlan> = {
  weekly: {
    id: "weekly",
    name: "週流星方案",
    priceLabel: "$299 / 週",
    amount: 299,
    durationDays: 7,
    stripePriceEnv: "STRIPE_WEEKLY_PRICE_ID",
    benefits: ["人才頁置頂排序", "精選標籤曝光", "雇主電子報推播"]
  },
  monthly: {
    id: "monthly",
    name: "月遊俠方案",
    priceLabel: "$899 / 月",
    amount: 899,
    durationDays: 30,
    stripePriceEnv: "STRIPE_MONTHLY_PRICE_ID",
    popular: true,
    benefits: ["人才頁置頂排序 30 天", "精選標籤曝光", "雇主電子報推播", "首頁人才推薦優先候選"]
  }
};

export function getPromotionPlan(planId: string | null | undefined) {
  if (planId === "weekly" || planId === "monthly") {
    return promotionPlans[planId];
  }

  return null;
}
