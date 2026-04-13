-- Add 'etsy' to the marketplace CHECK constraints on conversations and listings tables.

ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_marketplace_check;

ALTER TABLE conversations
  ADD CONSTRAINT conversations_marketplace_check
  CHECK (marketplace IN ('amazon', 'walmart', 'ebay', 'shopify', 'etsy'));

ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_marketplace_check;

ALTER TABLE listings
  ADD CONSTRAINT listings_marketplace_check
  CHECK (marketplace IN ('amazon', 'walmart', 'ebay', 'shopify', 'etsy'));
