-- eBay connections: stores OAuth tokens and setup state per user
-- Idempotent — safe to re-run if table/columns already exist from a prior attempt.

CREATE TABLE IF NOT EXISTS ebay_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ebay_user_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  merchant_location_key TEXT,
  fulfillment_policy_id TEXT,
  return_policy_id TEXT,
  payment_policy_id TEXT,
  policies_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One connection per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_ebay_connections_user_unique ON ebay_connections(user_id);

-- RLS (same pattern as listings/conversations)
ALTER TABLE ebay_connections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ebay_connections' AND policyname = 'select_own') THEN
    CREATE POLICY "select_own" ON ebay_connections FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ebay_connections' AND policyname = 'insert_own') THEN
    CREATE POLICY "insert_own" ON ebay_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ebay_connections' AND policyname = 'update_own') THEN
    CREATE POLICY "update_own" ON ebay_connections FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ebay_connections' AND policyname = 'delete_own') THEN
    CREATE POLICY "delete_own" ON ebay_connections FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Reuse existing updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_ebay_connections ON ebay_connections;
CREATE TRIGGER set_updated_at_ebay_connections
  BEFORE UPDATE ON ebay_connections FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- eBay publishing columns on listings (IF NOT EXISTS requires Postgres 9.6+)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ebay_status TEXT DEFAULT 'none';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ebay_offer_id TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ebay_listing_id TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ebay_sku TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ebay_error TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ebay_published_at TIMESTAMPTZ;
