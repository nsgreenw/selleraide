import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Record a usage event in the usage_events table.
 */
export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  eventType: string,
  conversationId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("usage_events").insert({
    user_id: userId,
    event_type: eventType,
    conversation_id: conversationId ?? null,
    metadata: metadata ?? null,
  });

  if (error) {
    throw new Error(`Failed to record usage event: ${error.message}`);
  }
}

/**
 * Increment the listings_used_this_period counter on the user's profile.
 */
export async function incrementListingCount(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("listings_used_this_period")
    .eq("id", userId)
    .single();

  if (fetchError || !profile) {
    throw new Error(
      `Failed to fetch profile: ${fetchError?.message ?? "not found"}`
    );
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      listings_used_this_period: profile.listings_used_this_period + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    throw new Error(
      `Failed to increment listing count: ${updateError.message}`
    );
  }
}

/**
 * Check if the user's billing period has elapsed. If period_reset_at is in the
 * past, reset listings_used_this_period to 0 and set a new period_reset_at
 * 30 days from now.
 */
export async function resetPeriodIfNeeded(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("period_reset_at")
    .eq("id", userId)
    .single();

  if (fetchError || !profile) {
    throw new Error(
      `Failed to fetch profile: ${fetchError?.message ?? "not found"}`
    );
  }

  const resetAt = new Date(profile.period_reset_at);
  const now = new Date();

  if (resetAt > now) {
    // Period has not elapsed yet
    return false;
  }

  // Period has elapsed -- reset counter and set new period 30 days out
  const newResetAt = new Date();
  newResetAt.setDate(newResetAt.getDate() + 30);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      listings_used_this_period: 0,
      period_reset_at: newResetAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`Failed to reset period: ${updateError.message}`);
  }

  return true;
}
