# Codex Security and Code Quality Review (2026-02-20)

## Executive Summary
The current uncommitted changes add useful v1 marketplace capabilities, but they introduce two high-risk reliability/compliance regressions and several medium-risk consistency gaps. Most critical issues are around schema/validation drift (Amazon bullet constraints) and unsafe runtime assumptions when processing AI-generated metadata objects. In its current state, this change set is **No-Go** for production marketplace listing generation.

## High Risk

### 1) Missing enforcement for Amazon bullet policy constraints
- Severity: High
- File:path: `src/lib/marketplace/amazon.ts:19`, `src/lib/qa/validator.ts:221`
- Evidence snippet:
```ts
// amazon.ts
{ name: "bullets", maxLength: null, required: true, ... }

// validator.ts (only short-bullet heuristic, no exact count/per-bullet max)
if (content.bullets && content.bullets.length > 0) {
  ... if (bullet.trim().length > 0 && bullet.trim().length < 20) ...
}
```
- Impact: Amazon-specific requirements described in profile/prompt (exactly 5 bullets, max 500 chars each) are not deterministically enforced. Non-compliant listings can pass validation/scoring and be surfaced as “ready,” increasing suppression/rejection risk.
- Concrete fix: Add marketplace-aware structural validation for Amazon bullets: require exactly 5 bullets and enforce per-bullet max length 500; emit `error` severity when violated.

### 2) Runtime crash risk from non-string metadata values (`trim()` on unknown)
- Severity: High
- File:path: `src/lib/qa/scorer.ts:694`, `src/lib/qa/validator.ts:345`, `src/app/api/listings/[id]/refine/route.ts:182`, `src/lib/gemini/generate.ts:155`
- Evidence snippet:
```ts
// scorer.ts
const filled = entries.filter(([, v]) => v && v.trim() && v !== "null").length;

// validator.ts
if (!value || value.trim().length === 0) { ... }

// mapping casts unknown objects directly
refinedContent.item_specifics = listingData.item_specifics as Record<string, string>;
```
- Impact: AI output can include `null`/non-string values in `item_specifics` or `attributes`. Calling `.trim()` on non-strings throws and can fail generation/refinement requests with 500 errors.
- Concrete fix: Normalize metadata values at ingestion (`String(value ?? "")` or null-safe parser), and guard trim checks with `typeof value === "string"` before trimming.

## Medium Risk

### 1) Amazon prompt/schema key mismatch can drop bullets during generation
- Severity: Medium
- File:path: `src/lib/marketplace/amazon.ts:19`, `src/lib/marketplace/amazon.ts:346`, `src/lib/gemini/generate.ts:29`, `src/lib/gemini/generate.ts:113`
- Evidence snippet:
```ts
// fields instruction key
name: "bullets"

// required listing shape key
"bullet_points"

// parser in generate.ts handles bullet_points but not bullets array
if (Array.isArray(listingData.bullet_points)) { ... }
```
- Impact: Conflicting key guidance increases probability Gemini returns `bullets` instead of `bullet_points`; generation mapper may omit bullets entirely, reducing quality and causing avoidable validation failures.
- Concrete fix: Use one canonical key across `fields`, `listingShape`, prompts, and mappers. Prefer `bullet_points` end-to-end or support both keys explicitly during parsing.

### 2) Marketplace feature-flag enforcement is incomplete (UI/API drift)
- Severity: Medium
- File:path: `src/lib/marketplace/registry.ts:15`, `src/lib/api/contracts.ts:23`, `src/components/chat/marketplace-picker.tsx:6`
- Evidence snippet:
```ts
// registry has runtime flags
export function getEnabledMarketplaceIds() { ... }

// API still accepts all marketplaces
z.enum(["amazon", "walmart", "ebay", "shopify"])

// UI hardcoded to amazon/ebay
const marketplaces = [{id:"amazon"}, {id:"ebay"}]
```
- Impact: Disabled marketplaces can still be created/generated via API, while UI shows a different set. This breaks policy intent and creates unpredictable routing/compliance behavior.
- Concrete fix: Drive both API validation and UI picker from a single enabled-marketplace source; reject disabled marketplace values server-side.

## Low Risk

### 1) Backend search terms are not normalized before persistence
- Severity: Low
- File:path: `src/lib/gemini/generate.ts:129`, `src/app/api/listings/[id]/refine/route.ts:140`
- Evidence snippet:
```ts
content.backend_keywords = listingData.backend_search_terms.join(" ");
```
- Impact: Empty tokens, duplicates, and spacing artifacts reduce byte efficiency and ranking quality. Not a security issue, but avoidable data quality loss.
- Concrete fix: Normalize terms (`trim`, filter empty, dedupe case-insensitively, then join with single spaces) and cap at byte limit.

## Test Gaps
- No tests cover `null` or non-string values in `item_specifics`/`attributes` to prevent `.trim()` runtime crashes.
- No tests verify Amazon bullet rules (exactly 5 bullets and max 500 chars each) are enforced as hard validation errors.
- No tests cover mixed key handling (`bullets` vs `bullet_points`) in generation/refinement mappers.
- No tests verify disabled marketplaces are rejected by API when feature flags are off.
- No tests assert backend search term normalization behavior (dedupe/trim/byte-bound).

## Suggested Fixes
1. Implement strict marketplace-specific structural validators (Amazon bullet count/per-item length, eBay required listing-completeness fields).
2. Add robust metadata normalization/parsing layer before `validateListing`/`scoreListing` to prevent type-based runtime failures.
3. Unify schema keys across profile fields, listing shape, prompt text, and parsing logic.
4. Enforce feature flags at API boundary and align UI marketplace options with server-allowed values.
5. Add regression tests for all above paths, including malformed AI payloads.

## Go/No-Go Recommendation
**No-Go** until both High Risk findings are fixed and regression tests are added for malformed metadata payload handling plus Amazon bullet policy enforcement.

## Prioritized Top-5 Action List
1. Fix non-string metadata handling to eliminate `.trim()` crash paths in validator/scorer.
2. Add deterministic Amazon bullet validation (exactly 5, max 500 each) with `error` severity.
3. Resolve `bullets` vs `bullet_points` schema mismatch across generation pipeline.
4. Enforce marketplace feature flags in API request validation and creation routes.
5. Add targeted tests for malformed AI outputs and policy-critical constraints before merge.
