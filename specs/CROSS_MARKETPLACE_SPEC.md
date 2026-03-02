# SellerAide — Cross-Marketplace Repurpose Spec

**Goal:** Let users take any existing listing and repurpose it for a different marketplace with one click.
**Key Insight:** The `ProductContext` + `ResearchData` already exist per conversation. We just re-run `generateListing()` with a different marketplace profile — no new AI pipelines needed.

---

## Architecture

```
User views listing (Amazon) → clicks "Repurpose to eBay"
→ API fetches original conversation's product_context
→ researchProduct(ctx, "ebay")  ← new research for target marketplace
→ generateListing(ctx, "ebay")  ← new generation with eBay profile
→ analyzeListing(content, "ebay")
→ New conversation + listing record created
→ User redirected to new listing detail page
```

---

## Why

Sellers list on multiple marketplaces. Today they have to start from scratch for each one — re-describing the product, waiting for extraction + research + generation. Cross-marketplace repurpose skips all of that. A listing that scored 92 on Amazon becomes a tailored eBay listing in seconds.

---

## What Already Exists

- `generateListing(productContext, marketplace)` is fully marketplace-agnostic ✅
- `researchProduct(productContext, marketplace)` adapts research to marketplace ✅
- `analyzeListing(content, marketplace)` scores against the target marketplace ✅
- `ProductContext` stored as JSON on conversations (`product_context` column) ✅
- Marketplace profiles drive all marketplace-specific behavior ✅
- Usage tracking + trial/subscription gating in `/api/generate` ✅

---

## Database Changes

None. We create a new conversation + listing using existing tables. The new conversation references the target marketplace and gets its own `product_context`.

---

## API Route

### `POST /api/listings/[id]/repurpose` (NEW)

Request body:
```json
{
  "marketplace": "ebay"
}
```

Flow:

1. `requireAuth()` → verify user owns listing
2. Validate with `repurposeSchema` — marketplace must be enabled and different from source
3. **Gate check** — same trial/subscription logic as `/api/generate` (counts as a generation)
4. Fetch source listing → get its `conversation_id` → fetch conversation's `product_context`
5. If no `conversation_id` (manually saved listing), extract context from existing content:
   ```ts
   // Build ProductContext from listing content as fallback
   const ctx: ProductContext = {
     product_name: sourceListing.content.title,
     category: sourceListing.content.category_hint ?? "General",
     key_features: sourceListing.content.bullets ?? [],
   };
   ```
6. `researchProduct(productContext, targetMarketplace)` — fresh research for target marketplace
7. Attach `research_data` to context
8. `generateListing(productContext, targetMarketplace)` → `ListingContent`
9. Insert new conversation (`status: "completed"`, `marketplace: target`, `product_context`)
10. Insert new listing (`version: 1`, `conversation_id: newConversation.id`)
11. `analyzeListing(content, targetMarketplace)` → update listing with QA
12. Increment usage (trial or subscription)
13. Return `{ conversation, listing, qa }`

### Error cases:
- Source and target marketplace are the same → 400
- Target marketplace disabled → 403
- Usage limit reached → 403 with upgrade prompt
- Source listing not found / not owned → 404

---

## Zod Schema — `contracts.ts`

```ts
export const repurposeSchema = z.object({
  marketplace: z.enum(["amazon", "walmart", "ebay", "shopify"]),
});
```

Validation that target ≠ source happens in the route handler (needs source listing data).

---

## UI Changes

### 1. Listing Detail Page — Repurpose Button

Add a dropdown button next to the existing Export menu on the listing detail page.

**File:** New component `src/components/listing/repurpose-menu.tsx`

```
[Repurpose ▾]
  → Amazon
  → eBay
  → Walmart
  → Shopify
```

- Current marketplace is grayed out / disabled
- Only shows enabled marketplaces
- Click → loading state → redirect to `/listings/{newId}`

**Props:** `listingId: string`, `currentMarketplace: Marketplace`

### 2. Listing Detail Page — Source Link

When a listing was created via repurpose, show a small badge:
```
Repurposed from Amazon listing · View original
```

This requires no schema change — we can store the source listing ID in conversation metadata (the `product_context` JSON).

---

## Implementation Order

### Phase 1: API (backend only)
1. Add `repurposeSchema` to `contracts.ts`
2. Create `src/app/api/listings/[id]/repurpose/route.ts`
3. Extract the trial/subscription gating logic from `/api/generate/route.ts` into a shared helper `checkGenerationLimits(profile, supabase)` to avoid duplication
4. Test: `curl -X POST /api/listings/{id}/repurpose -d '{"marketplace":"ebay"}'`

### Phase 2: UI
5. Create `repurpose-menu.tsx` component
6. Add RepurposeMenu to listing detail page (next to ExportMenu)
7. Add "Repurposed from X" badge on listing detail

---

## Common Pitfalls

1. **Usage gating duplication** — The trial/subscription check logic is currently inline in `/api/generate`. Extract it to a shared function so `/api/listings/[id]/repurpose` doesn't duplicate 30 lines of gating code.
2. **Manually saved listings have no conversation** — Handle the `conversation_id: null` case by building `ProductContext` from listing content fields.
3. **Research is marketplace-specific** — Always run fresh `researchProduct()` for the target marketplace. Don't reuse the source marketplace's research data.
4. **Marketplace must be enabled** — Check `isMarketplaceEnabled(target)` before proceeding.
5. **Don't mutate source** — This creates entirely new conversation + listing records. The source listing is untouched.

---

## Env Vars

None — uses existing AI provider and Supabase config.

---

## Acceptance Criteria

- [ ] User can repurpose any listing to a different enabled marketplace
- [ ] Repurpose counts as a generation (trial run or subscription usage)
- [ ] New listing gets fresh research + generation for target marketplace
- [ ] New listing has its own QA score against target marketplace rules
- [ ] Manually saved listings (no conversation) can still be repurposed
- [ ] Current marketplace is disabled in the repurpose menu
- [ ] User is redirected to the new listing after repurpose completes
- [ ] `npm run build` passes
