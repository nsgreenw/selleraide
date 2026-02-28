# AGENTS.md - SellerAide

## ⚠️ CRITICAL CONTEXT

**Repo was reverted on 2026-02-27** to commit `dd688eb` after a previous Codex session damaged main branch. The Codex eBay integration attempt is preserved on `ebay-attempt-backup` branch (uncommitted changes in `git stash`).

**Current state (main @ `d727554`):**
- Free trial feature: code complete, migration `005_free_trial.sql` applied to Supabase
- AI provider switching: working (`AI_PROVIDER` env var)
- QA engine: working (`src/lib/qa/`)
- Chrome extension: built, submitted to Chrome Web Store
- Anthropic SDK added as dependency
- `.gitignore` updated to exclude `meta-ads/node_modules/`

**What was lost in the revert:**
- Codex's eBay integration attempt (preserved on `ebay-attempt-backup` branch)
- Any work between `dd688eb` and the revert

## Git Rules (MANDATORY)
1. **Never work directly on main.** Create `feature/` branches for all work.
2. **Merge and delete branches when done.**
3. **Run `npm run build` before committing.** If it fails, fix it.
4. **Don't `git add -A` blindly** — check what you're staging.

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (Auth + Postgres + RLS)
- Stripe (subscriptions)
- AI: Gemini (default) or Anthropic (via `AI_PROVIDER` env)

## Key Files
- `src/lib/gemini/client.ts` — AI provider switching logic
- `src/lib/subscription/` — plans, trial logic, Stripe helpers
- `src/lib/qa/` — listing quality analysis engine
- `src/app/api/generate/route.ts` — main listing generation endpoint
- `supabase/migrations/` — 5 migrations (all applied)
- `extension/` — Chrome extension source
- `specs/` — feature specs (FREE_TRIAL_SPEC.md, EBAY_INTEGRATION_SPEC.md)

## Supabase
- URL: `https://wbvizvrqfhrguwdjlbuu.supabase.co` (check Vercel env vars)
- Migrations 001-005 applied
- RLS enabled on all tables
- `increment_listing_count` and `increment_trial_run` RPCs exist

## What NOT to do
- Don't touch migration files that are already applied
- Don't add `node_modules` to git (check `.gitignore`)
- Don't change Stripe product/price IDs without coordinating
- Don't modify the Chrome extension without bumping its version
