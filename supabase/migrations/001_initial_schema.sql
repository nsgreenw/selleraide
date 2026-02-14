-- ============================================================================
-- 001_initial_schema.sql
-- SellerAide initial database migration (idempotent — safe to re-run)
-- ============================================================================

-- ============================================================================
-- 1. TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id                        UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email                     TEXT        NOT NULL,
    full_name                 TEXT,
    avatar_url                TEXT,
    subscription_tier         TEXT        NOT NULL DEFAULT 'free'
                              CHECK (subscription_tier IN ('free', 'starter', 'pro', 'agency')),
    subscription_status       TEXT        NOT NULL DEFAULT 'active'
                              CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
    stripe_customer_id        TEXT        UNIQUE,
    stripe_subscription_id    TEXT        UNIQUE,
    listings_used_this_period INTEGER     NOT NULL DEFAULT 0,
    period_reset_at           TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title           TEXT        NOT NULL DEFAULT 'New Conversation',
    marketplace     TEXT        NOT NULL
                    CHECK (marketplace IN ('amazon', 'walmart', 'ebay', 'shopify')),
    status          TEXT        NOT NULL DEFAULT 'gathering'
                    CHECK (status IN ('gathering', 'researching', 'generating', 'refining', 'completed')),
    product_context JSONB       NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT        NOT NULL
                    CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT        NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listings (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    marketplace     TEXT        NOT NULL
                    CHECK (marketplace IN ('amazon', 'walmart', 'ebay', 'shopify')),
    version         INTEGER     NOT NULL DEFAULT 1,
    content         JSONB       NOT NULL DEFAULT '{}',
    qa_results      JSONB,
    score           INTEGER     CHECK (score >= 0 AND score <= 100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_events (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type      TEXT        NOT NULL,
    conversation_id UUID        REFERENCES conversations(id) ON DELETE SET NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id                       TEXT    PRIMARY KEY,
    name                     TEXT    NOT NULL,
    price_monthly_cents      INTEGER NOT NULL,
    listings_per_month       INTEGER,
    stripe_price_id_monthly  TEXT,
    stripe_price_id_yearly   TEXT,
    features                 JSONB   NOT NULL DEFAULT '[]'
);

-- ============================================================================
-- 2. INDEXES (IF NOT EXISTS)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_conversations_user_id       ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id    ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_listings_user_id            ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_conversation_id    ON listings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id        ON usage_events(user_id);

-- ============================================================================
-- 3. ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop all policies first (safe if they don't exist)
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "conversations_select_own" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_own" ON conversations;
DROP POLICY IF EXISTS "conversations_update_own" ON conversations;
DROP POLICY IF EXISTS "conversations_delete_own" ON conversations;
DROP POLICY IF EXISTS "messages_select_own" ON messages;
DROP POLICY IF EXISTS "messages_insert_own" ON messages;
DROP POLICY IF EXISTS "listings_select_own" ON listings;
DROP POLICY IF EXISTS "listings_insert_own" ON listings;
DROP POLICY IF EXISTS "listings_update_own" ON listings;
DROP POLICY IF EXISTS "listings_delete_own" ON listings;
DROP POLICY IF EXISTS "usage_events_select_own" ON usage_events;
DROP POLICY IF EXISTS "usage_events_insert_own" ON usage_events;
DROP POLICY IF EXISTS "subscription_plans_select_authenticated" ON subscription_plans;

-- profiles
CREATE POLICY "profiles_select_own"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- conversations
CREATE POLICY "conversations_select_own"
    ON conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "conversations_insert_own"
    ON conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_update_own"
    ON conversations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "conversations_delete_own"
    ON conversations FOR DELETE
    USING (auth.uid() = user_id);

-- messages
CREATE POLICY "messages_select_own"
    ON messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "messages_insert_own"
    ON messages FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM conversations WHERE user_id = auth.uid()
        )
    );

-- listings
CREATE POLICY "listings_select_own"
    ON listings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "listings_insert_own"
    ON listings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "listings_update_own"
    ON listings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "listings_delete_own"
    ON listings FOR DELETE
    USING (auth.uid() = user_id);

-- usage_events
CREATE POLICY "usage_events_select_own"
    ON usage_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "usage_events_insert_own"
    ON usage_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- subscription_plans
CREATE POLICY "subscription_plans_select_authenticated"
    ON subscription_plans FOR SELECT
    USING (auth.role() = 'authenticated');

-- ============================================================================
-- 4. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Atomic listing count increment to prevent race conditions
CREATE OR REPLACE FUNCTION public.increment_listing_count(p_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
  SET listings_used_this_period = listings_used_this_period + 1,
      updated_at = now()
  WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_conversations ON conversations;
CREATE TRIGGER set_updated_at_conversations
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_listings ON listings;
CREATE TRIGGER set_updated_at_listings
    BEFORE UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 5. SEED DATA — subscription_plans (upsert to avoid duplicates)
-- ============================================================================

INSERT INTO subscription_plans (id, name, price_monthly_cents, listings_per_month, features)
VALUES
    ('free', 'Free', 0, 5,
     '["5 listings per month", "All marketplaces", "Basic QA scoring", "Copy to clipboard export"]'::jsonb),
    ('starter', 'Starter', 1900, 50,
     '["50 listings per month", "All marketplaces", "Full QA scoring", "PDF & CSV export", "Priority AI generation"]'::jsonb),
    ('pro', 'Pro', 4900, 200,
     '["200 listings per month", "All marketplaces", "Full QA scoring", "All export formats", "Priority AI generation", "Listing history"]'::jsonb),
    ('agency', 'Agency', 9900, NULL,
     '["Unlimited listings", "All marketplaces", "Full QA scoring", "All export formats", "Priority AI generation", "Listing history", "Priority support"]'::jsonb)
ON CONFLICT (id) DO NOTHING;
