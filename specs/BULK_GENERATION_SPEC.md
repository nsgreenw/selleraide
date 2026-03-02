# SellerAide — Bulk Generation Spec

**Goal:** Let users upload a CSV of products and generate optimized listings for all of them in a single batch.
**Key Insight:** The generation pipeline is already per-product (`extract → research → generate → score`). Bulk generation wraps this in a queue with progress tracking. The hard part is UX, not AI.

---

## Architecture

```
User uploads CSV (product descriptions + marketplace)
→ API validates CSV, creates a "batch" record
→ For each row: extract → research → generate → score → save listing
→ Progress streamed to client via polling
→ User sees results page with scores + links to each listing
```

---

## Why

Power sellers list 10–50+ products at a time. Generating one-by-one is tedious. Bulk generation is the #1 feature request from the seller audience — it turns SellerAide from a "try it once" tool into a daily workflow tool. It also directly drives subscription upgrades because trial users will hit their 3-run limit immediately.

---

## What Already Exists

- `extractProductContextFromDescription()` handles arbitrary product text ✅
- `researchProduct()` + `generateListing()` are per-product, marketplace-agnostic ✅
- `analyzeListing()` scores each listing independently ✅
- CSV parsing logic exists in `src/lib/csv/ebay-import.ts` (for eBay import) ✅
- Usage gating (trial + subscription) ✅
- Listing + conversation insert patterns ✅

---

## Database Changes

### Migration: `007_batches.sql` (NEW)

```sql
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  -- status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  total_rows INTEGER NOT NULL,
  completed_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batches"
  ON public.batches FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own batches"
  ON public.batches FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Add batch_id to listings table for grouping
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL;
```

---

## CSV Format

### Input CSV — required columns

| Column | Required | Description |
|---|---|---|
| `product_description` | Yes | Free-text product description (10–15000 chars) |
| `condition` | No | Item condition (eBay: "New", "Like New", etc.) |
| `condition_notes` | No | Flaw description for used items |

First row must be headers. Max rows per batch: starter=10, pro=50, agency=200.

### Example

```csv
product_description,condition,condition_notes
"Sony WH-1000XM5 wireless noise cancelling headphones, 30hr battery, multipoint bluetooth, touch controls",New,
"Used Canon EOS R6 Mark II mirrorless camera body, 24.2MP, 4K60, minor scuff on bottom plate",Good,"Small scuff on bottom plate, does not affect function. All original accessories included."
```

---

## API Routes

### `POST /api/batch` (NEW) — Create batch

Request: `multipart/form-data`
- `file`: CSV file (max 2MB)
- `marketplace`: target marketplace string

Flow:

1. `requireAuth()` → fetch profile
2. Parse CSV, validate headers + row count
3. **Tier limit check:**
   - Trial: cannot use bulk (must upgrade)
   - Starter: max 10 rows
   - Pro: max 50 rows
   - Agency: max 200 rows
4. **Usage check** — total rows must fit within remaining period limit
5. Validate each row: `product_description` present and 10+ chars
6. Insert `batches` record (`status: 'pending'`, `total_rows: validRows.length`)
7. **Start processing** — kick off an async function that processes rows sequentially (see Processing section)
8. Return `{ batch: { id, status, total_rows } }`

### `GET /api/batch/[id]` (NEW) — Get batch status

Response:
```json
{
  "batch": {
    "id": "...",
    "status": "processing",
    "marketplace": "amazon",
    "total_rows": 15,
    "completed_rows": 7,
    "failed_rows": 1,
    "created_at": "..."
  },
  "listings": [
    { "id": "...", "title": "...", "score": 88, "status": "completed" },
    { "id": "...", "title": "...", "score": null, "status": "failed", "error": "Generation failed" },
    { "id": "...", "title": null, "score": null, "status": "pending" }
  ]
}
```

Returns batch metadata + all listings created so far (with their scores).

### `POST /api/batch/[id]/cancel` (NEW) — Cancel in-progress batch

Sets `status: 'cancelled'`. Processing loop checks this flag before each row and stops early. Already-completed listings are kept.

---

## Processing Logic — `src/lib/batch/processor.ts` (NEW)

```ts
export async function processBatch(
  batchId: string,
  rows: BatchRow[],
  marketplace: Marketplace,
  userId: string
): Promise<void>
```

For each row:

1. Check if batch has been cancelled (query `batches.status`)
2. `extractProductContextFromDescription(row.product_description, marketplace)`
3. Overlay `condition` + `condition_notes` if present
4. `researchProduct(ctx, marketplace)` — best-effort, failures swallowed
5. `generateListing(ctx, marketplace)` → `ListingContent`
6. Insert conversation (`status: "completed"`)
7. Insert listing (`batch_id: batchId`, `version: 1`)
8. `analyzeListing(content, marketplace)` → update listing with QA
9. Update batch: `completed_rows += 1`
10. Increment usage (trial or subscription counter)

On per-row failure:
- Log error, update batch `failed_rows += 1`, continue to next row
- Do NOT stop the batch for individual failures

On completion:
- Set batch `status: 'completed'` (or `'failed'` if all rows failed)

### Sequential processing (not parallel)

Process rows one at a time. Reasons:
- Gemini rate limits (RPM/TPM) will throttle parallel requests
- Easier to track progress and report to user
- Simpler error handling and cancellation
- If we need parallelism later, we can add a concurrency parameter

### Async execution

The `/api/batch` POST route starts processing and returns immediately. Processing runs as a fire-and-forget async function within the serverless invocation. On Vercel, this means:

- The response returns immediately
- Processing continues in the background via `waitUntil()` (Next.js `after()` API)
- Client polls `GET /api/batch/[id]` for progress

```ts
import { after } from "next/server";

// In the POST handler, after inserting batch record:
after(async () => {
  await processBatch(batchId, validRows, marketplace, user.id);
});

return jsonSuccess({ batch }, 201);
```

**Important:** `after()` runs after the response is sent but within the same serverless function invocation. Vercel's max function duration applies (default 10s on Hobby, 60s on Pro, 300s on Enterprise). For large batches on lower tiers, we may need to implement chunked processing or a different async strategy. Start with `after()` and document the limitation.

---

## UI Changes

### 1. Batch Upload Page — `src/app/(app)/batch/page.tsx` (NEW)

Accessible from the sidebar (add "Bulk Generate" tool to the tool switcher).

```
┌─ Bulk Generate ──────────────────────────────────────────────────┐
│                                                                   │
│  Marketplace:  [Amazon ▾]                                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │   Drop CSV here or click to upload                         │ │
│  │   Max 50 products · Columns: product_description            │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [Download Template CSV]                                         │
│                                                                   │
│  [Generate All Listings]                                         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

- Marketplace selector (same as chat/generate)
- Drag-and-drop file upload zone
- "Download Template" link → serves a pre-filled CSV with headers + 2 example rows
- Preview table showing parsed rows before submission
- "Generate All" button → creates batch → navigates to progress page

### 2. Batch Progress Page — `src/app/(app)/batch/[id]/page.tsx` (NEW)

```
┌─ Bulk Generate — Processing ─────────────────────────────────────┐
│                                                                   │
│  ████████████░░░░░░░░  7/15 completed · 1 failed                │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ ✓  Sony WH-1000XM5 Wireless Headphones...        Score: 88 ││
│  │ ✓  Canon EOS R6 Mark II Camera Body...            Score: 91 ││
│  │ ✗  [Row 3] Generation failed                               ││
│  │ ⟳  Processing row 8 of 15...                               ││
│  │ ·  Row 9 — pending                                          ││
│  │ ·  Row 10 — pending                                         ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  [Cancel]                                    [View All Listings] │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

- Progress bar (completed / total)
- Per-row status: completed (with title + score link), failed (with error), processing (spinner), pending
- Polls `GET /api/batch/[id]` every 3 seconds while `status !== "completed"`
- Cancel button while processing
- "View All Listings" → filtered listings page showing batch results

### 3. Sidebar — Add Bulk Generate Tool

Add to the `TOOLS` array in `sidebar.tsx`:

```ts
{ id: "batch", label: "Bulk Generate", icon: Layers, path: "/batch", newLabel: "New Batch" },
```

---

## Zod Schemas — `contracts.ts`

```ts
export const createBatchSchema = z.object({
  marketplace: z.enum(["amazon", "walmart", "ebay", "shopify"]),
});

// Row validation (internal, not for API contract)
export const batchRowSchema = z.object({
  product_description: z.string().min(10).max(15000),
  condition: z.string().optional(),
  condition_notes: z.string().max(2000).optional(),
});
```

---

## Subscription Tier Limits

| Tier | Max rows per batch | Notes |
|---|---|---|
| Trial | 0 | Must upgrade — show upgrade prompt |
| Starter | 10 | Each row counts as 1 generation |
| Pro | 50 | Each row counts as 1 generation |
| Agency | 200 | Each row counts as 1 generation |

Each successfully generated listing counts toward the user's `listings_used_this_period`. The batch creation endpoint checks upfront that the user has enough remaining quota for all rows.

---

## Implementation Order

### Phase 1: Backend core
1. Create migration `007_batches.sql`
2. Create `src/lib/batch/processor.ts` — row-by-row processing loop
3. Create `POST /api/batch` route (CSV upload, validation, kick off processing)
4. Create `GET /api/batch/[id]` route (status + listing results)
5. Create `POST /api/batch/[id]/cancel` route

### Phase 2: UI
6. Create batch upload page (`/batch`)
7. Create batch progress page (`/batch/[id]`)
8. Add "Bulk Generate" to sidebar tool switcher
9. Template CSV download

### Phase 3: Polish
10. Error handling edge cases (partial failures, timeout recovery)
11. Batch history (list past batches on `/batch` page)

---

## Common Pitfalls

1. **Vercel function timeout** — `after()` runs within the serverless function lifetime. On Hobby plan (10s), only ~1-2 listings can complete per invocation. On Pro (60s), maybe 5-8. For large batches, consider chunked processing: process N rows, save progress, use a Vercel Cron Job or client-side polling trigger to resume. Document this limitation upfront.
2. **Rate limits** — Gemini has RPM (requests per minute) and TPM (tokens per minute) limits. Sequential processing with natural latency (~3-5s per listing) should stay under limits for batches ≤50. Add a small delay (500ms) between rows as a safety buffer.
3. **Usage accounting** — Charge usage per completed row, not per batch. If a batch of 20 has 3 failures, only 17 count toward the subscription limit.
4. **CSV encoding** — Handle UTF-8 BOM, Windows line endings (CRLF), and quoted fields with commas/newlines. Use a proper CSV parser (e.g., `papaparse`), not string splitting.
5. **Don't block on email/analytics** — Usage recording and any notifications should be fire-and-forget, just like in the single generation flow.
6. **Memory** — Don't load all generated listings into memory. Process and save one at a time. The progress page fetches results from the DB.
7. **Cancellation race** — Check `batch.status` before each row, not just at the start. User might cancel mid-batch.

---

## Package Dependencies

```bash
npm install papaparse
npm install -D @types/papaparse
```

(Or reuse existing CSV parsing if `src/lib/csv/ebay-import.ts` already has a capable parser — check before adding.)

---

## Env Vars

None — uses existing AI provider and Supabase config.

---

## Acceptance Criteria

- [ ] User can upload a CSV and generate listings for all rows
- [ ] Progress page shows real-time completion status
- [ ] Each generated listing is individually viewable with QA score
- [ ] Failed rows don't stop the batch — processing continues
- [ ] Cancel stops processing, keeps already-completed listings
- [ ] Row count enforced per subscription tier
- [ ] Each completed row counts as 1 generation toward usage limit
- [ ] Trial users see upgrade prompt (cannot use bulk)
- [ ] Template CSV available for download
- [ ] Works for all enabled marketplaces
- [ ] `npm run build` passes
