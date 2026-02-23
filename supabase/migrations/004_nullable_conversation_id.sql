-- Migration 004: Make listings.conversation_id nullable
-- Allows listings created from the audit/optimize flow to be saved
-- without requiring a chat conversation context.

ALTER TABLE listings ALTER COLUMN conversation_id DROP NOT NULL;
