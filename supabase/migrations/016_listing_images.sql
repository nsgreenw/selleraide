-- Add an images column to listings and create the Supabase Storage bucket
-- that holds uploaded product photos. URLs are embedded directly in the
-- column (not a separate table) since we only ever read them as a group
-- per listing and ordering = array order.
--
-- Each entry: { "url": string, "source": "upload" | "url", "storagePath"?: string }

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Public bucket — eBay (and other marketplaces) need to fetch URLs
-- unauthenticated when they ingest the listing. Writes are controlled
-- server-side via the service role, so no INSERT/DELETE policies are
-- needed on storage.objects.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif'];
