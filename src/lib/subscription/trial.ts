import type { SupabaseClient } from "@supabase/supabase-js";

export const TRIAL_MAX_RUNS = 3;

export interface TrialStatus {
  isTrialing: boolean;
  isExpired: boolean;
  runsUsed: number;
  runsRemaining: number;
  daysRemaining: number;
  canGenerate: boolean;
}

type TrialProfile = {
  subscription_status: string;
  trial_expires_at: string | null;
  trial_runs_used: number;
};

export function getTrialStatus(profile: TrialProfile): TrialStatus {
  const isTrialing = profile.subscription_status === "trialing";

  if (!isTrialing) {
    return {
      isTrialing: false,
      isExpired: false,
      runsUsed: 0,
      runsRemaining: 0,
      daysRemaining: 0,
      canGenerate: true, // defer to normal subscription gate
    };
  }

  const now = new Date();
  const expiresAt = profile.trial_expires_at ? new Date(profile.trial_expires_at) : now;
  const msRemaining = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / 86400000));
  const runsUsed = profile.trial_runs_used ?? 0;
  const runsRemaining = Math.max(0, TRIAL_MAX_RUNS - runsUsed);
  const isExpired = daysRemaining <= 0 || runsRemaining <= 0;

  return {
    isTrialing: true,
    isExpired,
    runsUsed,
    runsRemaining,
    daysRemaining,
    canGenerate: !isExpired,
  };
}

export async function incrementTrialRun(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase.rpc("increment_trial_run", {
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to increment trial run: ${error.message}`);
}
