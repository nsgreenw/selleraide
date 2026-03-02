-- Harden RPC functions: add auth.uid() verification, SET search_path, REVOKE/GRANT
--
-- Both functions are SECURITY DEFINER and accept p_user_id. Without an auth.uid()
-- check, any authenticated user could call them with another user's ID.
-- We allow auth.uid() IS NULL so service-role calls (batch processor) still work.

-- ── increment_listing_count ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_listing_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-role calls have auth.uid() = NULL; allow those.
  -- Authenticated calls must match p_user_id.
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'unauthorized: uid mismatch';
  END IF;

  UPDATE profiles
  SET listings_used_this_period = listings_used_this_period + 1,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_listing_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_listing_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_listing_count(uuid) TO service_role;

-- ── increment_trial_run ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_trial_run(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'unauthorized: uid mismatch';
  END IF;

  UPDATE profiles
  SET trial_runs_used = COALESCE(trial_runs_used, 0) + 1
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_trial_run(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_trial_run(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_trial_run(uuid) TO service_role;
