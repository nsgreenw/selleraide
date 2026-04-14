-- Make ebay_user_id nullable in ebay_connections.
--
-- The OAuth callback does not fetch the eBay user ID (that would require
-- adding the commerce.identity.readonly scope and re-authorizing all
-- existing connections). The original 009 migration declared this column
-- nullable; this migration realigns the production schema.

ALTER TABLE ebay_connections
  ALTER COLUMN ebay_user_id DROP NOT NULL;
