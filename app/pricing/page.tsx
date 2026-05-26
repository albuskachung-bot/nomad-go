import { CheckCircle2, Sparkles } from "lucide-react";
import PricingCheckoutButton from "@/components/pricing/PricingCheckoutButton";
import { promotionPlans } from "@/lib/pricing";

export default function PricingPage() {
  const plans = [promotionPlans.weekly, promotionPlans.monthly];

  return (
    <div className="bg-gray-50">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Sponsored Profiles
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-gray-900 sm:text-5xl">
            讓你的遠端履歷被雇主優先看見
          </h1>
          <p className="mt-5 text-lg leading-8 text-gray-500">
            付費置頂會讓你的 Profile 排在人才列表前段，並在雇主週報中獲得額外曝光。
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`relative rounded-lg bg-white p-6 shadow-sm ring-1 transition hover:-translate-y-1 hover:shadow-soft ${
                plan.popular ? "ring-2 ring-blue-200" : "ring-gray-100"
              }`}
            >
              {plan.popular ? (
                <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  熱門
                </span>
              ) : null}

              <h2 className="text-2xl font-semibold text-gray-900">{plan.name}</h2>
              <div className="mt-4 text-4xl font-semibold tracking-normal text-gray-900">
                {plan.priceLabel}
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                付款完成後自動啟用付費置頂，期限會寫入你的 Talent Profile。
              </p>

              <div className="mt-6 space-y-3">
                {plan.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
                    {benefit}
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <PricingCheckoutButton planId={plan.id} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
