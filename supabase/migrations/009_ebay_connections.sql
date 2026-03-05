-- eBay connections: stores OAuth tokens and setup state per user
CREATE TABLE ebay_connections (
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
CREATE UNIQUE INDEX idx_ebay_connections_user_unique ON ebay_connections(user_id);

-- RLS (same pattern as listings/conversations)
ALTER TABLE ebay_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own" ON ebay_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own" ON ebay_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own" ON ebay_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own" ON ebay_connections FOR DELETE USING (auth.uid() = user_id);

-- Reuse existing updated_at trigger
CREATE TRIGGER set_updated_at_ebay_connections
  BEFORE UPDATE ON ebay_connections FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- eBay publishing columns on listings
ALTER TABLE listings ADD COLUMN ebay_status TEXT DEFAULT 'none';
ALTER TABLE listings ADD COLUMN ebay_offer_id TEXT;
ALTER TABLE listings ADD COLUMN ebay_listing_id TEXT;
ALTER TABLE listings ADD COLUMN ebay_sku TEXT;
ALTER TABLE listings ADD COLUMN ebay_error TEXT;
ALTER TABLE listings ADD COLUMN ebay_published_at TIMESTAMPTZ;
