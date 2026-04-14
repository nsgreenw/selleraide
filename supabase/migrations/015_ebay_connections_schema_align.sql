-- Align ebay_connections with the schema the app code expects.
--
-- The production table is missing columns that migration 009 declared:
--   - policies_verified, merchant_location_key
--   - fulfillment_policy_id, return_policy_id, payment_policy_id
--   - created_at, updated_at
--
-- The status, policies, and publish routes select these columns, so their
-- absence makes selects fail silently and the connection appears
-- disconnected in the UI even after a successful OAuth.

ALTER TABLE ebay_connections
  ADD COLUMN IF NOT EXISTS policies_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS merchant_location_key TEXT,
  ADD COLUMN IF NOT EXISTS fulfillment_policy_id TEXT,
  ADD COLUMN IF NOT EXISTS return_policy_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_policy_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill created_at from connected_at if that legacy column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ebay_connections' AND column_name = 'connected_at'
  ) THEN
    UPDATE ebay_connections
    SET created_at = connected_at,
        updated_at = connected_at
    WHERE created_at = updated_at; -- only touch freshly-added defaults
  END IF;
END $$;
