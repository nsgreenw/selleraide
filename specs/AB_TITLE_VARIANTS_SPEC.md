# SellerAide — A/B Title Variants Spec

**Goal:** Generate 3–5 alternative titles for any listing, each scored by the QA system, so sellers can pick the strongest option or test variations.
**Key Insight:** Title is the highest-leverage field for click-through rate. Generating multiple candidates is cheap (single LLM call) and the scoring pipeline already exists. This is a fast feature with high perceived value.

---

## Architecture

```
User views listing → clicks "Generate Title Variants"
→ API sends current listing + marketplace profile to LLM
→ LLM returns 5 title candidates with different keyword strategies
→ Each title scored by QA (title_keyword_richness + title_length_optimization)
→ Variants displayed ranked by score
→ User picks one → listing title updated in place → full QA re-run
```

---

## Why

Amazon and eBay search heavily weight the title. Sellers agonize over title structure — keyword order, brand placement, character count. Giving them 5 scored options eliminates guesswork and creates an "aha" moment: "I can see exactly why this title scores higher."

---

## What Already Exists

- `scoreListing()` already scores `title_keyword_richness` and `title_length_optimization` ✅
- `validateListing()` checks title constraints (maxLength, banned terms) ✅
- Marketplace profiles define title limits and keyword strategies ✅
- Listing refine flow handles updating listing content + re-scoring ✅
- `getGeminiGenerateModel()` available for structured generation ✅

---

## Database Changes

None. Variants are ephemeral — generated on demand, not stored. The user picks one and it becomes the listing title (updated via existing refine/save flow).

---

## API Route

### `POST /api/listings/[id]/title-variants` (NEW)

Request body: (none — all data comes from the listing)

Response:
```json
{
  "variants": [
    {
      "title": "Wireless Bluetooth Headphones Noise Cancelling Over-Ear Headset 40H Battery",
      "score": 88,
      "strategy": "keyword-front-loaded",
      "notes": "Highest search volume keywords placed first, strong feature coverage"
    },
    {
      "title": "Premium Noise Cancelling Bluetooth Headphones — 40Hr Battery, Hi-Res Audio",
      "score": 82,
      "strategy": "benefit-led",
      "notes": "Leads with quality signal, emphasizes key benefits"
    }
    // ... 3 more
  ],
  "current": {
    "title": "...",
    "score": 74
  }
}
```

Flow:

1. `requireAuth()` → verify user owns listing
2. Fetch listing + marketplace profile
3. Build prompt with:
   - Current title + full listing content (for context)
   - Marketplace title constraints (max length, banned terms)
   - Keyword strategy from marketplace profile
   - Research data from conversation (if available) — keywords, trends
   - Instruction: generate exactly 5 titles, each with a different strategy
4. Call `getGeminiGenerateModel().generateContent(prompt)` (temperature 0.8 — want diversity)
5. Parse 5 title candidates from JSON response
6. For each candidate, run a **title-only mini-score**:
   - `title_keyword_richness` criterion function
   - `title_length_optimization` criterion function
   - Average the two → 0–100 title score
   - Run banned-term check → flag violations
7. Filter out any titles that violate constraints (over max length, banned terms)
8. Sort by score descending
9. Return variants + current title with its score for comparison

### Title scoring helper — `src/lib/qa/title-scorer.ts` (NEW)

```ts
export function scoreTitleVariant(
  title: string,
  fullContent: ListingContent,
  marketplace: Marketplace
): { score: number; violations: QAResult[] }
```

This extracts just the title-relevant scoring criteria and banned-term checks from the full QA pipeline. It substitutes the candidate title into a copy of `ListingContent` and runs the relevant criterion functions.

### Prompt strategy

The LLM prompt asks for 5 titles using these strategy labels:
1. **keyword-front-loaded** — highest search volume terms first
2. **benefit-led** — leads with a compelling benefit or quality signal
3. **long-tail** — targets specific long-tail search phrases
4. **brand-forward** — brand name first (when brand is known)
5. **compact-punchy** — shortest viable title, maximizes clarity

Each variant includes a `strategy` label and brief `notes` explaining the approach.

---

## UI Changes

### 1. Title Variants Button — Listing Detail Page

Add a small "sparkle" button next to the title in `ListingDetail`:

```
Title                                                    [✨ Variants]
┌─────────────────────────────────────────────────────────────────────┐
│ Wireless Bluetooth Headphones Noise Cancelling Over-Ear 40H Battery│
│                                                          148/200   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Title Variants Panel — `src/components/listing/title-variants.tsx` (NEW)

Slides in below the title field when opened. Shows:

```
┌─ Title Variants ────────────────────────────────────────── [×] ─┐
│                                                                  │
│  Current: "Wireless Bluetooth..." ──────────────── Score: 74    │
│                                                                  │
│  ● "Premium Noise Cancelling Bluetooth..."  ── 88  [Use This]  │
│    Strategy: keyword-front-loaded                                │
│    Highest search volume keywords placed first                   │
│                                                                  │
│  ● "Noise Cancelling Wireless Headphones..."  ── 82  [Use This] │
│    Strategy: benefit-led                                         │
│    Leads with quality signal, emphasizes key benefits            │
│                                                                  │
│  ... 3 more variants                                             │
└──────────────────────────────────────────────────────────────────┘
```

Each variant shows:
- The title text
- Score badge (reuse `ScoreBadge` component, `size="sm"`)
- Strategy label (label-kicker style)
- Notes (small text)
- "Use This" button

### 3. "Use This" action

When clicked:
- `PATCH /api/listings/[id]` with updated title (or call the existing save mechanism)
- Re-run full `analyzeListing()` to update the overall listing score
- Close the variants panel
- Refresh listing detail with new title + new score

**Note:** We need a `PATCH /api/listings/[id]` route for direct field updates. Currently only refine (LLM-based) and full save exist. This is a simple partial update:

```ts
// PATCH /api/listings/[id] — update specific fields
const { content: updates } = patchListingSchema.parse(body);
const merged = { ...existingContent, ...updates };
// analyzeListing(merged, marketplace) → update listing
```

---

## Zod Schema — `contracts.ts`

```ts
export const patchListingSchema = z.object({
  content: z.object({
    title: z.string().min(1).max(500).optional(),
    // Extensible — add more fields later as needed
  }).refine(obj => Object.keys(obj).length > 0, "At least one field required"),
});
```

---

## Implementation Order

### Phase 1: Scoring helper
1. Create `src/lib/qa/title-scorer.ts` — extract title scoring from full QA pipeline

### Phase 2: API
2. Add `POST /api/listings/[id]/title-variants` route
3. Add `PATCH /api/listings/[id]` route for direct field updates
4. Add schemas to `contracts.ts`

### Phase 3: UI
5. Create `src/components/listing/title-variants.tsx`
6. Add "Variants" button to listing detail page
7. Wire "Use This" → PATCH → refresh

---

## Common Pitfalls

1. **Temperature matters** — Use 0.8 for variant generation. The default 0.4 (generation model) produces titles that are too similar to each other.
2. **Score the title in context** — Don't score titles in isolation. Substitute into the full `ListingContent` because some criteria check keyword overlap between title and bullets/description.
3. **Banned terms in variants** — The LLM might generate titles with banned terms despite instructions. Always validate and filter post-generation.
4. **No usage charge** — Title variants should NOT count as a generation toward trial/subscription limits. It's a refinement of an existing listing, not a new one.
5. **Research data enhances quality** — If the conversation has `research_data` with keywords, include them in the prompt. Variants without keyword data will be generic.

---

## Env Vars

None — uses existing AI provider config.

---

## Acceptance Criteria

- [ ] User can generate 5 title variants for any listing
- [ ] Each variant has a score, strategy label, and notes
- [ ] Current title shown with its score for comparison
- [ ] "Use This" replaces the listing title and triggers full QA re-score
- [ ] Variants respect marketplace title length limits
- [ ] Variants with banned terms are filtered out
- [ ] Does NOT count as a generation (no usage charge)
- [ ] Works for all enabled marketplaces
- [ ] `npm run build` passes
