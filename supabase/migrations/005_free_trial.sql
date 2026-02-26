-- Add trial tracking columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_runs_used integer NOT NULL DEFAULT 0;

-- Update handle_new_user trigger: new signups start on a 7-day trial with starter features
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, avatar_url,
    subscription_tier, subscription_status,
    listings_used_this_period, period_reset_at,
    trial_expires_at, trial_runs_used
  ) VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'starter',             -- starter features during trial
    'trialing',
    0,
    now() + interval '30 days',
    now() + interval '7 days',
    0
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: atomically increment trial_runs_used
CREATE OR REPLACE FUNCTION public.increment_trial_run(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET trial_runs_used = COALESCE(trial_runs_used, 0) + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
