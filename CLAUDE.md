# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build — run before committing
npm run lint         # ESLint
npx vitest run       # Run all tests
npx vitest run tests/lib/qa/validator.test.ts  # Run a single test file
npx vitest --watch   # Watch mode
```

## Git Rules

1. **Never work directly on main.** Create `feature/` branches for all work.
2. Merge and delete branches when done.
3. Run `npm run build` before committing. If it fails, fix it.
4. Don't `git add -A` blindly — check what you're staging.

## Architecture

SellerAide is an AI-powered e-commerce listing generator. Users describe a product via chat or single-shot generation, and the system produces optimized marketplace listings (Amazon, eBay, Walmart, Shopify) with quality scores.

### Stack

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
- Supabase (Auth, Postgres with RLS, service role for webhooks)
- Stripe (subscriptions, checkout, billing portal, webhooks)
- AI: Google Gemini 2.0 Flash (default) or Anthropic Claude (via `AI_PROVIDER` env var)
- Vitest + jsdom for testing

### Route Groups

- `src/app/(auth)/` — Login, signup, forgot-password (centered card layout)
- `src/app/(app)/` — Authenticated app: chat, listings, audit, settings (wrapped in `AppProvider` + `AppShell`)
- `src/app/(public)/` — Legal pages (privacy, terms, etc.)
- `src/app/page.tsx` — Marketing landing page

### Core Flows

**Chat flow** — Multi-turn conversation with a state machine in `src/lib/gemini/chat.ts`:
```
gathering → researching → generating → refining
```
`gathering` accumulates `ProductContext` via LLM extraction until enough info exists (product name + category + ≥3 features), then auto-transitions through research and generation.

**Single-shot flow** — `/api/generate` does extract → research → generate in one request.

**QA** — Deterministic (no AI) scoring in `src/lib/qa/`. Runs `validateListing` (field constraints, banned terms, structural rules) then `scoreListing` (weighted 0-100 with A-F grade). Executes on every listing save.

### Key Architectural Patterns

**Lazy initialization** — All external clients (Stripe, Gemini, Anthropic, Supabase Admin) use lazy getter functions (`getStripe()`, `getGeminiModel()`, `getSupabaseAdmin()`). Never initialize at module scope — Next.js build evaluates all module code and will throw on missing env vars.

**AI provider switching** — `src/lib/gemini/client.ts` checks `AI_PROVIDER` env var. Three model tiers with different temperatures: conversational (1.0), research (0.7), generation (0.4). Business logic in `generate.ts`, `research.ts`, `extract.ts` is provider-agnostic.

**Marketplace profiles** — Self-contained config objects in `src/lib/marketplace/` drive prompts, validation rules, scoring weights, banned term patterns, and keyword strategies. All marketplace-specific behavior flows from these profiles, not hardcoded logic.

**Auth** — No Next.js middleware. Auth is enforced per API route via `requireAuth()` from `src/lib/api/auth-guard.ts`. The `/api/audit` route is intentionally unauthenticated (used by the Chrome extension).

**API responses** — All routes use `jsonError()`/`jsonSuccess()` from `src/lib/api/response.ts`, which attach `Cache-Control: private, no-cache` headers.

**Subscription/Trial gating** — Two separate gates: trial users check `trial_runs_used` against 3-run limit; subscribed users check period listing count against tier limit. Trial status is determined by `subscription_status === "trialing"`.

### Key Files

| Path | Purpose |
|---|---|
| `src/lib/gemini/client.ts` | AI provider switching, lazy model factories |
| `src/lib/gemini/chat.ts` | Chat state machine (`handleChatMessage`) |
| `src/lib/qa/validator.ts` | Deterministic listing validation |
| `src/lib/qa/scorer.ts` | Weighted 0-100 scoring |
| `src/lib/marketplace/*.ts` | Marketplace profile configs |
| `src/lib/subscription/` | Plans, usage tracking, trial logic, Stripe |
| `src/lib/supabase/` | Three clients: browser, server (cookies), admin (service role) |
| `src/lib/api/contracts.ts` | Zod schemas for all API inputs |
| `src/types/index.ts` | All TypeScript types |
| `src/app/globals.css` | Tailwind 4 theme (`@theme inline` block) with design tokens |
| `extension/` | Chrome extension (scrapes Amazon/eBay pages, calls `/api/audit`) |
| `specs/` | Feature specs (FREE_TRIAL_SPEC.md, EBAY_INTEGRATION_SPEC.md) |

### Database

Supabase with 5 applied migrations in `supabase/migrations/`. Tables: `profiles`, `conversations`, `messages`, `listings`, `usage_events`, `subscription_plans`. RLS enabled on all tables. Two RPCs: `increment_listing_count`, `increment_trial_run`. **Do not modify applied migration files** — create new migrations for schema changes.

### Design System

Dark-only "Canary Style" with glassmorphic cards. Custom CSS classes in `globals.css`: `.card-glass`, `.card-subtle`, `.btn-primary`, `.btn-secondary`, `.label-kicker`. Fonts: Manrope (primary), IBM Plex Mono (technical labels). Icons: `lucide-react` exclusively. Brand colors: `--sa-100` (#fce8b4), `--sa-200` (#f6cb63), `--sa-300` (#f2b743).

### Tailwind CSS 4

Uses `@import "tailwindcss"` + `@theme inline` block — **not** v3 `@tailwind` directives. PostCSS config uses `@tailwindcss/postcss`.

### Testing

Tests live in `tests/` with `@/` path alias configured in `vitest.config.ts`. Existing coverage: QA validator, scorer, marketplace profile schemas. jsdom environment enabled globally.

### Deployment

Vercel project (Git integration disconnected). Deploy via `vercel --prod --yes`. Chrome extension submitted to Chrome Web Store — bump version in `extension/manifest.json` before modifying.

## What NOT to Do

- Don't touch applied migration files in `supabase/migrations/`
- Don't add `node_modules` to git
- Don't change Stripe product/price IDs without coordinating
- Don't modify the Chrome extension without bumping its manifest version
- Don't initialize external clients at module scope (use lazy getters)
- Don't use Tailwind v3 directives (`@tailwind base/components/utilities`)
