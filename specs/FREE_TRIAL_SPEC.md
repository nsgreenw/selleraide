# SellerAide Free Trial — Build Spec

## Overview
No-credit-card free trial for new signups. 7 days OR 3 listing generations, whichever comes first.

## Why
TikTok CTAs drive cold traffic → paywall bounce. Trial removes friction, lets users get their "holy shit" listing score moment, then converts.

## What Already Exists
- `SubscriptionStatus` type includes `"trialing"` ✅
- `SubscriptionTier` has `"free"` tier ✅
- `listings_used_this_period` counter on profiles ✅
- `increment_listing_count` RPC ✅
- `canGenerateListing()` gate check ✅
- Plans already mention "7-day free trial" in feature lists ✅

## Database Changes

### Migration: `005_free_trial.sql`
```sql
-- Add trial tracking columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_runs_used integer DEFAULT 0;

-- Set trial for all NEW signups going forward (handle in trigger)
-- Existing users with subscription_status = 'active' are unaffected.

-- Update the handle_new_user trigger to set trial defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, avatar_url,
    subscription_tier, subscription_status,
    listings_used_this_period, period_reset_at,
    trial_expires_at, trial_runs_used
  ) VALUES (
    new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url',
    'starter',          -- give them starter-level features during trial
    'trialing',
    0,
    now() + interval '30 days',
    now() + interval '7 days',  -- trial expires in 7 days
    0                            -- 0 runs used
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Code Changes

### 1. Trial gate check — `src/lib/subscription/trial.ts` (NEW)
```typescript
import type { Profile } from "@/types";

const TRIAL_MAX_RUNS = 3;

export interface TrialStatus {
  isTrialing: boolean;
  isExpired: boolean;
  runsRemaining: number;
  daysRemaining: number;
  canGenerate: boolean;
}

export function getTrialStatus(profile: Profile): TrialStatus {
  const isTrialing = profile.subscription_status === "trialing";

  if (!isTrialing) {
    return {
      isTrialing: false,
      isExpired: false,
      runsRemaining: 0,
      daysRemaining: 0,
      canGenerate: true, // defer to normal subscription check
    };
  }

  const now = new Date();
  const expiresAt = new Date(profile.trial_expires_at!);
  const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000));
  const runsRemaining = Math.max(0, TRIAL_MAX_RUNS - (profile.trial_runs_used ?? 0));
  const isExpired = daysRemaining <= 0 || runsRemaining <= 0;

  return {
    isTrialing: true,
    isExpired,
    runsRemaining,
    daysRemaining,
    canGenerate: !isExpired,
  };
}
```

### 2. Increment trial runs — `src/lib/subscription/trial.ts` (add)
```typescript
export async function incrementTrialRun(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase.rpc("increment_trial_run", {
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to increment trial run: ${error.message}`);
}
```

### 3. RPC function — in migration
```sql
CREATE OR REPLACE FUNCTION public.increment_trial_run(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET trial_runs_used = COALESCE(trial_runs_used, 0) + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Wire into generation flow
In the listing generation API route (wherever `canGenerateListing` is called):

```typescript
import { getTrialStatus, incrementTrialRun } from "@/lib/subscription/trial";

// Before generation:
const trialStatus = getTrialStatus(profile);

if (profile.subscription_status === "trialing") {
  if (!trialStatus.canGenerate) {
    // Return upgrade prompt
    return { error: "trial_expired", trialStatus };
  }
  // After successful generation:
  await incrementTrialRun(supabase, userId);
} else {
  // Existing subscription logic (canGenerateListing check)
}
```

### 5. UI: Trial banner — show on dashboard when trialing
```
🎉 Free Trial: {runsRemaining} of 3 runs left · {daysRemaining} days remaining
[Upgrade to keep going →]
```

When expired:
```
⏰ Your free trial has ended. Upgrade to continue optimizing.
[See Plans →]
```

### 6. Update `plans.ts` — `free` tier
Change `listingsPerMonth: 0` to `listingsPerMonth: 3` for the free/trial tier, OR keep it at 0 and handle trial separately (recommended — cleaner separation).

## What NOT to Change
- Stripe products/prices — no changes needed
- Existing active subscribers — unaffected
- The `free` tier stays as-is (it's the "no subscription" fallback)
- Trial users get `starter` tier features so they experience the real product

## CTA Updates
- TikTok: "Try SellerAide free — no credit card"
- Landing page: "Start your free trial" button → signs up → immediate access
- Post-trial: "Your 3 free runs showed you what SellerAide can do. Keep going for $19/mo."

## Profile Type Update
Add to `src/types/index.ts`:
```typescript
export interface Profile {
  // ... existing fields ...
  trial_expires_at: string | null;
  trial_runs_used: number;
}
```

## Acceptance Criteria
- [ ] New signup → subscription_status = 'trialing', tier = 'starter'
- [ ] Trial user can generate up to 3 listings
- [ ] Trial user sees runs remaining in UI
- [ ] After 3 runs OR 7 days → generation blocked, upgrade prompt shown
- [ ] Upgrading via Stripe → status changes to 'active', trial fields ignored
- [ ] Existing subscribers unaffected
