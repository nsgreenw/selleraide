-- Ensure ebay_connections has the id primary key column.
--
-- Migration 009 defined `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` but
-- in production the column is missing, causing upserts that reference it
-- (or that PostgREST internally expects) to fail with error 42703.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ebay_connections' AND column_name = 'id'
  ) THEN
    ALTER TABLE ebay_connections
      ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid();

    -- Drop any existing primary key (would be on user_id if set) and
    -- make id the primary key. user_id still has the unique index.
    BEGIN
      ALTER TABLE ebay_connections DROP CONSTRAINT ebay_connections_pkey;
    EXCEPTION WHEN undefined_object THEN
      -- No existing primary key, ignore
      NULL;
    END;

    ALTER TABLE ebay_connections ADD PRIMARY KEY (id);
  END IF;
END $$;
