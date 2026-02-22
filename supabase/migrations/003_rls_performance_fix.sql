-- Fix: wrap auth.uid() and auth.role() in (select ...) in all RLS policies.
--
-- Without the SELECT wrapper, PostgreSQL re-evaluates auth.uid() for every
-- row scanned. With it, the value is computed once as an "init plan" and
-- reused, which significantly improves query performance at scale.
--
-- Run this in the Supabase SQL editor to apply to the live database.

-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
    ON profiles FOR SELECT
    USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    USING ((select auth.uid()) = id);

-- conversations
DROP POLICY IF EXISTS "conversations_select_own" ON conversations;
CREATE POLICY "conversations_select_own"
    ON conversations FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "conversations_insert_own" ON conversations;
CREATE POLICY "conversations_insert_own"
    ON conversations FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "conversations_update_own" ON conversations;
CREATE POLICY "conversations_update_own"
    ON conversations FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "conversations_delete_own" ON conversations;
CREATE POLICY "conversations_delete_own"
    ON conversations FOR DELETE
    USING ((select auth.uid()) = user_id);

-- messages
DROP POLICY IF EXISTS "messages_select_own" ON messages;
CREATE POLICY "messages_select_own"
    ON messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE user_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "messages_insert_own" ON messages;
CREATE POLICY "messages_insert_own"
    ON messages FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM conversations WHERE user_id = (select auth.uid())
        )
    );

-- listings
DROP POLICY IF EXISTS "listings_select_own" ON listings;
CREATE POLICY "listings_select_own"
    ON listings FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "listings_insert_own" ON listings;
CREATE POLICY "listings_insert_own"
    ON listings FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "listings_update_own" ON listings;
CREATE POLICY "listings_update_own"
    ON listings FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "listings_delete_own" ON listings;
CREATE POLICY "listings_delete_own"
    ON listings FOR DELETE
    USING ((select auth.uid()) = user_id);

-- usage_events
DROP POLICY IF EXISTS "usage_events_select_own" ON usage_events;
CREATE POLICY "usage_events_select_own"
    ON usage_events FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "usage_events_insert_own" ON usage_events;
CREATE POLICY "usage_events_insert_own"
    ON usage_events FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

-- subscription_plans
DROP POLICY IF EXISTS "subscription_plans_select_authenticated" ON subscription_plans;
CREATE POLICY "subscription_plans_select_authenticated"
    ON subscription_plans FOR SELECT
    USING ((select auth.role()) = 'authenticated');
