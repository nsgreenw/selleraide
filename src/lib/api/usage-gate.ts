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
 * Shared dual-path usage gate: checks trial OR subscription limits.
 * Returns the profile on success, or an error message on rejection.
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
  } else {
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
  }

  return { allowed: true, profile };
}

/**
 * Track a usage "run" after successful AI generation.
 * Increments trial_runs_used or listings_used_this_period based on status.
 * Non-blocking — callers should catch errors.
 */
export async function trackUsage(
  supabase: SupabaseClient,
  userId: string,
  subscriptionStatus: string
): Promise<void> {
  if (subscriptionStatus === "trialing") {
    await incrementTrialRun(supabase, userId);
  } else {
    await incrementListingCount(supabase, userId);
  }
}
