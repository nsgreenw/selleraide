import type { SupabaseClient } from "@supabase/supabase-js";
import { canGenerateListing } from "@/lib/subscription/plans";
import { getTrialStatus, incrementTrialRun } from "@/lib/subscription/trial";
import { incrementListingCount } from "@/lib/subscription/usage";

interface UsageProfile {
  subscription_tier: string;
  subscription_status: string;
  listings_used_this_period: number;
  trial_expires_at: string | null;
  trial_runs_used: number;
}

type UsageGateSuccess = { allowed: true; profile: UsageProfile };
type UsageGateRejected = { allowed: false; error: string };
export type UsageGateResult = UsageGateSuccess | UsageGateRejected;

const PROFILE_SELECT =
  "subscription_tier, subscription_status, listings_used_this_period, trial_expires_at, trial_runs_used";

/**
 * Shared usage gate for Stripe-backed subscriptions and trials.
 */
export async function requireUsageGate(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageGateResult> {
  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .single();

  if (!profile) {
    return { allowed: false, error: "Profile not found. Please log in again." };
  }

  const hasAccess =
    profile.subscription_tier !== "free" &&
    ["active", "trialing", "past_due"].includes(profile.subscription_status);

  if (!hasAccess) {
    return {
      allowed: false,
      error:
        "Choose a paid plan to start your 7-day free trial and keep generating listings.",
    };
  }

  if (profile.subscription_status === "trialing") {
    const trial = getTrialStatus(profile);
    if (!trial.canGenerate) {
      const reason =
        trial.daysRemaining <= 0
          ? "Your 7-day free trial has ended."
          : `You've used all ${trial.runsUsed} free trial generations.`;
      return {
        allowed: false,
        error: `${reason} Upgrade to keep generating listings.`,
      };
    }
  }

  const allowed = canGenerateListing(
    profile.subscription_tier,
    profile.listings_used_this_period
  );
  if (!allowed) {
    return {
      allowed: false,
      error:
        "You have reached your listing limit for this billing period. Please upgrade your plan.",
    };
  }

  return { allowed: true, profile };
}

/**
 * Track usage after successful generation.
 */
export async function trackUsage(
  supabase: SupabaseClient,
  userId: string,
  subscriptionStatus: string
): Promise<void> {
  if (subscriptionStatus === "trialing") {
    await incrementTrialRun(supabase, userId);
    return;
  }

  await incrementListingCount(supabase, userId);
}
