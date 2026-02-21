# CC Fix Plan — SellerAide (2026-02-20)

Owner: Cody (orchestrator)
Executor: Claude Code CLI
Status: Approved for execution

## Objective
Resolve Codex review findings and bring the current SellerAide uncommitted changes to a production-ready state for Amazon + eBay v1.

## Scope
In-scope: current uncommitted changes in this repo.
Out-of-scope: adding new marketplace integrations beyond Amazon/eBay.

---

## Phase 1 — High Risk Fixes (Blockers)

### 1) Harden metadata parsing (prevent runtime `.trim()` crashes)

**Files to update:**
- `src/lib/gemini/generate.ts`
- `src/app/api/listings/[id]/refine/route.ts`
- `src/lib/qa/validator.ts`
- `src/lib/qa/scorer.ts`

**Tasks:**
- Add normalization helper(s) for AI-produced object fields (`item_specifics`, `attributes`) to coerce values safely.
- Guard all trim/string assumptions with type checks.
- Ensure validator/scorer never throw on null/number/object values.

**Acceptance criteria:**
- No runtime throw when metadata has null/non-string values.

### 2) Enforce Amazon bullet constraints deterministically

**Files to update:**
- `src/lib/qa/validator.ts`
- `src/lib/marketplace/amazon.ts` (if metadata/constraints need alignment)

**Tasks:**
- Enforce strict Amazon bullets:
  - exactly 5 bullets
  - each bullet <= 500 chars
  - non-empty bullet content
- Violations should be `error` severity.

**Acceptance criteria:**
- Non-compliant Amazon bullets cannot pass as ready.

---

## Phase 2 — Consistency & Policy Alignment

### 3) Unify `bullets` vs `bullet_points` schema keys

**Files to update:**
- `src/lib/marketplace/amazon.ts`
- `src/lib/gemini/generate.ts`
- `src/app/api/listings/[id]/refine/route.ts`

**Tasks:**
- Use one canonical key (`bullet_points`) across listing shape/prompt/parsing.
- Add backward-compatible fallback parsing for legacy key (`bullets`) during transition.

**Acceptance criteria:**
- No dropped bullet content due to key mismatch.

### 4) Enforce marketplace feature flags at API boundary

**Files to update:**
- `src/lib/marketplace/registry.ts`
- `src/lib/api/contracts.ts`
- Any API routes using marketplace enum validation

**Tasks:**
- Ensure disabled marketplaces are rejected server-side.
- Align API-accepted marketplaces with enabled runtime config (not just UI).
- Keep Walmart/Shopify disabled by default.

**Acceptance criteria:**
- Direct API calls cannot use disabled marketplaces.

---

## Phase 3 — Test Hardening

**Files to add/update:**
- `tests/lib/qa/validator.test.ts`
- `tests/lib/qa/scorer.test.ts`
- `tests/lib/marketplace/schema.test.ts`
- Additional API/contract tests if needed

**Required test cases:**
- Null/non-string metadata handling in `item_specifics`/`attributes`
- Amazon bullets count + max length enforcement
- Key compatibility (`bullets` and `bullet_points`)
- Disabled marketplace rejected by API
- Backend search term normalization behavior

**Acceptance criteria:**
- `npx vitest run tests/` passes
- `npm run build` passes

---

## Execution Rules
- Do not discard existing valid work.
- Keep changes minimal and targeted.
- If constraints conflict, prioritize deterministic validation + runtime safety.
- Summarize final output in a completion report with:
  1) changed files
  2) test results
  3) build result
  4) remaining risks (if any)

## Go/No-Go Gate
Go only if:
- All high-risk issues fixed
- Tests pass
- Build passes
- Remaining risks documented and non-blocking
