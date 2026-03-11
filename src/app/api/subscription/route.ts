import { requireAuth } from "@/lib/api/auth-guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { PLANS, canGenerateListing } from "@/lib/subscription/plans";
import { getTrialStatus, TRIAL_MAX_RUNS } from "@/lib/subscription/trial";
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
      "subscription_tier, subscription_status, listings_used_this_period, period_reset_at, stripe_customer_id, stripe_subscription_id, trial_runs_used, trial_expires_at"
    )
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return jsonError("Failed to fetch subscription details", 500);
  }

  const tier = profile.subscription_tier as SubscriptionTier;
  const plan = PLANS[tier];
  const trial = getTrialStatus(profile);
  const hasAccess =
    tier !== "free" &&
    (profile.subscription_status === "active" ||
      profile.subscription_status === "trialing" ||
      profile.subscription_status === "past_due");

  return jsonSuccess({
    subscription: {
      tier,
      status: profile.subscription_status,
      has_subscription: !!profile.stripe_subscription_id,
      trial_ends_at: profile.trial_expires_at,
      has_access: hasAccess,
    },
    usage: {
      listings_used: trial.isTrialing ? trial.runsUsed : profile.listings_used_this_period,
      listings_limit: !hasAccess ? 0 : trial.isTrialing ? TRIAL_MAX_RUNS : plan.listingsPerMonth,
      period_reset_at: profile.period_reset_at,
      can_generate:
        hasAccess &&
        (!trial.isTrialing || trial.canGenerate) &&
        canGenerateListing(tier, profile.listings_used_this_period),
    },
    plan: {
      name: plan.name,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      features: plan.features,
    },
  });
}
