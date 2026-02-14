# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npx vitest run       # Run all tests
npx vitest run tests/lib/some.test.ts  # Run a single test file
npx vitest --watch   # Watch mode
```

## Environment Variables

Copy `.env.local.example` to `.env.local`. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`.

## Architecture

**SellerAide** is an AI-powered e-commerce listing generator. Users chat with Gemini AI to describe their product, the system researches keywords/trends, generates marketplace-optimized listings, runs QA validation and scoring, and exports to PDF/CSV.

### Chat State Machine (core flow)
Conversations progress through phases: `gathering` → `researching` → `generating` → `refining` → `completed`. The state machine lives in `src/lib/gemini/chat.ts` — it reads the current conversation status, calls the appropriate Gemini function for that phase, then advances status. The `refining` ↔ `generating` loop lets users iterate on listings through chat.

### Marketplace-Driven Architecture
Each marketplace (Amazon, Walmart, eBay, Shopify) is a self-contained `MarketplaceProfile` object (`src/lib/marketplace/`) that defines field constraints (char/byte limits, HTML rules), banned terms with regex patterns, scoring weights, keyword strategy, photo slots, and a `listingShape` array of expected JSON keys. These profiles drive everything: Gemini prompt construction, listing validation, and QA scoring. To add a new marketplace, create a profile file and register it in `registry.ts`.

### QA System (`src/lib/qa/`)
Two-stage pipeline: `validator.ts` runs deterministic field checks (lengths, banned terms, HTML compliance) producing `QAResult[]` sorted by severity. `scorer.ts` computes a weighted 0–100 score across ~8 criteria (title keyword richness, description depth, compliance coverage, etc.) using per-marketplace weights. Combined via `analyzeListing()` in `index.ts`.

### API Route Pattern
All API routes follow: `requireAuth()` from `src/lib/api/auth-guard.ts` → parse body with Zod schema from `src/lib/api/contracts.ts` → business logic → respond with `jsonSuccess(data)` or `jsonError(message, status)` from `src/lib/api/response.ts`.

### Authentication & Authorization
Supabase email/password auth with `@supabase/ssr` middleware (`src/middleware.ts`). Protected paths (`/chat`, `/listings`, `/settings`) redirect to `/login` without a session. All database tables use RLS policies scoping to `auth.uid()`.

### Subscription & Usage
Four tiers (free/starter/pro/agency) defined in `src/lib/subscription/plans.ts` with listing quotas. Stripe handles checkout, subscriptions, and billing portal. Webhooks (`/api/webhooks/stripe`) sync subscription state to the `profiles` table. Usage is tracked via `listings_used_this_period` counter with monthly reset.

## Key Conventions

- **External client initialization**: Always use lazy singleton getters (`getStripe()`, `getGeminiModel()`, `getSupabaseAdmin()`) — never instantiate at module scope or env vars will throw during Next.js build.
- **Path alias**: `@/` maps to `./src/` (configured in both `tsconfig.json` and `vitest.config.ts`).
- **Tailwind CSS 4**: Uses `@import "tailwindcss"` with `@theme inline` block in `globals.css` — not Tailwind v3 `@tailwind` directives.
- **Design system**: Dark-only "Canary style" — glassmorphic cards (`card-glass`, `card-subtle`), gold accent (`--sa-200: #f6cb63`), `btn-primary`/`btn-secondary` utility classes, `label-kicker` for IBM Plex Mono uppercase labels.
- **Fonts**: Manrope (primary body/headings), IBM Plex Mono (labels, technical text). Both loaded via `next/font`.
- **Icons**: `lucide-react` exclusively — no other icon libraries.
- **HTML sanitization**: DOMPurify via `src/lib/utils/sanitize.ts` for any AI-generated HTML content.
- **Types**: All shared TypeScript types live in `src/types/index.ts`.
- **Route groups**: `(auth)` for public auth pages, `(app)` for authenticated pages wrapped in `AppProvider`.
- **Glob tool caveat**: Parenthesized route groups like `(app)` break the Glob tool — use Grep or Bash find for those paths.
- **Database schema**: Single migration at `supabase/migrations/001_initial_schema.sql` — tables: profiles, conversations, messages, listings, usage_events, subscription_plans.
