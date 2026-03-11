import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Profile } from "@/types";

const DEFAULT_PERIOD_DAYS = 30;

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function buildProfileSeed(user: User) {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  return {
    id: user.id,
    email: user.email ?? "",
    full_name: fullName,
    avatar_url: avatarUrl,
    subscription_tier: "free" as const,
    subscription_status: "canceled" as const,
    listings_used_this_period: 0,
    period_reset_at: addDays(DEFAULT_PERIOD_DAYS),
    trial_expires_at: null,
    trial_runs_used: 0,
  };
}

export async function ensureProfileForUser(user: User): Promise<Profile> {
  const admin = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (fetchError) {
    throw new Error(`Failed to fetch profile: ${fetchError.message}`);
  }

  if (existing) {
    const patch: Partial<Profile> = {};

    if (!existing.email && user.email) {
      patch.email = user.email;
    }

    if (!existing.full_name && typeof user.user_metadata?.full_name === "string") {
      patch.full_name = user.user_metadata.full_name;
    }

    if (!existing.avatar_url && typeof user.user_metadata?.avatar_url === "string") {
      patch.avatar_url = user.user_metadata.avatar_url;
    }

    if (Object.keys(patch).length === 0) {
      return existing;
    }

    const { data: updated, error: updateError } = await admin
      .from("profiles")
      .update(patch)
      .eq("id", user.id)
      .select("*")
      .single<Profile>();

    if (updateError || !updated) {
      throw new Error(
        `Failed to repair existing profile: ${updateError?.message ?? "unknown error"}`
      );
    }

    return updated;
  }

  const seed = buildProfileSeed(user);
  const { data: created, error: createError } = await admin
    .from("profiles")
    .upsert(seed, { onConflict: "id" })
    .select("*")
    .single<Profile>();

  if (createError || !created) {
    throw new Error(
      `Failed to create missing profile: ${createError?.message ?? "unknown error"}`
    );
  }

  return created;
}
