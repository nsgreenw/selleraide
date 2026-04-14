-- Ensure ebay_connections has a UNIQUE constraint on user_id so the
-- ON CONFLICT (user_id) clause in the upsert works. Migration 009
-- created a unique INDEX, but PostgREST's upsert path needs a formal
-- UNIQUE CONSTRAINT (or was missing in production entirely), causing
-- error 42P10 invalid_column_reference on connect attempts.

DO $$
BEGIN
  -- Remove any duplicate rows before adding the unique constraint
  DELETE FROM ebay_connections a
  USING ebay_connections b
  WHERE a.ctid < b.ctid
    AND a.user_id = b.user_id;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'ebay_connections'::regclass
      AND contype = 'u'
      AND conname = 'ebay_connections_user_id_key'
  ) THEN
    -- Drop the old unique index if it exists so the constraint can
    -- create its own backing index
    DROP INDEX IF EXISTS idx_ebay_connections_user_unique;
    ALTER TABLE ebay_connections
      ADD CONSTRAINT ebay_connections_user_id_key UNIQUE (user_id);
  END IF;
END $$;
