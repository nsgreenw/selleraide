-- Move SellerAide to Stripe-managed trials.
-- New users start with no active plan until they begin checkout.

ALTER TABLE profiles
  ALTER COLUMN subscription_status SET DEFAULT 'canceled';

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
    'free',
    'canceled',
    0,
    now() + interval '30 days',
    null,
    0
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Existing local trial records should become inactive so users must start
-- their Stripe-managed trial from checkout.
UPDATE profiles
SET
  subscription_tier = 'free',
  subscription_status = 'canceled',
  trial_expires_at = null,
  trial_runs_used = 0,
  updated_at = now()
WHERE subscription_status = 'trialing'
  AND stripe_subscription_id IS NULL;
