# CC Fix Implementation Report — 2026-02-20

## Scope Reviewed
Compared current uncommitted changes against findings in `docs/reviews/codex-review-2026-02-20.md`.

## Changed Files
- `src/app/(app)/chat/[id]/page.tsx`
- `src/app/api/listings/[id]/refine/route.ts`
- `src/components/chat/marketplace-picker.tsx`
- `src/components/chat/qa-results-card.tsx`
- `src/lib/gemini/generate.ts`
- `src/lib/marketplace/amazon.ts`
- `src/lib/marketplace/ebay.ts`
- `src/lib/marketplace/registry.ts`
- `src/lib/qa/scorer.ts`
- `src/lib/qa/validator.ts`
- `src/types/index.ts`
- `tests/lib/marketplace/schema.test.ts` (new)
- `tests/lib/qa/scorer.test.ts` (new)
- `tests/lib/qa/validator.test.ts` (new)

## What Was Fixed vs Prior Findings

### Fixed / Improved
1. **Amazon key mismatch (`bullets` vs `bullet_points`)**
   - `amazon.ts` listing shape now uses `bullet_points` and `backend_search_terms`.
   - `generate.ts` and refine route now map `bullet_points` arrays and keep legacy fallbacks.
   - Regression tests added for schema coherence.

2. **Marketplace surface narrowed in UI/runtime defaults**
   - `marketplace-picker.tsx` now shows Amazon + eBay only.
   - `registry.ts` adds environment-driven `getEnabledMarketplaceIds()` with safe defaults.

3. **Scoring/profile consistency and v1 field coverage expanded**
   - New criteria added and exported in scorer registry.
   - Amazon/eBay profiles aligned with current scoring criterion names.
   - New v1 optional fields mapped in generate/refine paths.

### Not Fully Fixed
1. **High: Amazon deterministic bullet policy enforcement missing**
   - No hard error validation found for:
     - exactly 5 bullets
     - max 500 chars per bullet
   - Current validator still only applies short-bullet heuristic warning.

2. **High: non-string metadata `.trim()` crash paths still present**
   - `validator.ts` and `scorer.ts` still call `.trim()` on metadata values without type guards.
   - `generate.ts` and refine route still cast object metadata to `Record<string, string>` without normalization.

3. **Medium: API feature-flag enforcement still incomplete**
   - `src/lib/api/contracts.ts` still accepts `amazon|walmart|ebay|shopify`.
   - UI/registry and API contract are still not fully unified.

4. **Low: backend search-term normalization still basic**
   - Search terms are still joined; no explicit trim/dedupe/byte-bounded normalization added.

## Test Results (exact)
Command: `npx vitest run tests/`
- **PASS**
- `Test Files 3 passed (3)`
- `Tests 21 passed (21)`

## Build Result (exact)
Command: `npm run build`
- **PASS**
- `✓ Compiled successfully`
- `✓ Generating static pages ... (22/22)`
- Build completed with a **Next.js workspace-root warning** about multiple lockfiles.

## Remaining Risks
- Runtime crash risk from non-string metadata values in `item_specifics` / `attributes`.
- Amazon compliance risk from missing strict bullet count/length enforcement.
- API policy drift risk from contracts accepting disabled marketplaces.

## Go / No-Go
**No-Go** for production release based on unresolved High findings, despite tests/build passing.
