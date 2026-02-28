import { requireAuth } from "@/lib/api/auth-guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { PLANS, canGenerateListing } from "@/lib/subscription/plans";
import { resetPeriodIfNeeded } from "@/lib/subscription/usage";
import type { SubscriptionTier } from "@/types";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, 401);
  }
  const user = auth.user!;

  const supabase = await createClient();

  // Reset the billing period if it has elapsed before returning data
  await resetPeriodIfNeeded(supabase, user.id);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "subscription_tier, subscription_status, listings_used_this_period, period_reset_at, stripe_customer_id, stripe_subscription_id, trial_runs_used"
    )
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return jsonError("Failed to fetch subscription details", 500);
  }

  const tier = profile.subscription_tier as SubscriptionTier;
  const plan = PLANS[tier];

  const isTrialing = profile.subscription_status === "trialing";
  const TRIAL_MAX_RUNS = 3;

  return jsonSuccess({
    subscription: {
      tier,
      status: profile.subscription_status,
      stripe_customer_id: profile.stripe_customer_id,
      stripe_subscription_id: profile.stripe_subscription_id,
    },
    usage: {
      listings_used: isTrialing
        ? ((profile as Record<string, unknown>).trial_runs_used as number ?? 0)
        : profile.listings_used_this_period,
      listings_limit: isTrialing ? TRIAL_MAX_RUNS : plan.listingsPerMonth,
      period_reset_at: profile.period_reset_at,
      can_generate: isTrialing
        ? (((profile as Record<string, unknown>).trial_runs_used as number ?? 0) < TRIAL_MAX_RUNS)
        : canGenerateListing(tier, profile.listings_used_this_period),
    },
    plan: {
      name: plan.name,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      features: plan.features,
    },
  });
}
