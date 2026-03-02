# Security Checklist

Audit performed 2026-03-02 after shipping security headers + CSRF origin checking.

---

## High Severity

### H1. Error messages leak internal details to clients
- **Category**: Data exposure
- **Status**: [x] Fixed (2026-03-02)
- **Files**:
  - `src/app/api/generate/route.ts:189` — `err.message` in 500 response
  - `src/app/api/listings/[id]/repurpose/route.ts:224` — same
  - `src/app/api/batch/route.ts:194` — same
  - `src/app/api/batch/[id]/route.ts:53` — same
  - `src/app/api/batch/[id]/cancel/route.ts:60` — same
  - `src/app/api/subscription/checkout/route.ts:142` — same
- **Risk**: Supabase, Stripe, or AI provider errors may contain table names, query details, API key prefixes, or internal URLs.
- **Fix**: Replace `err.message` with a generic "Internal server error" string. Keep `console.error` for server logs.

### H2. DOMPurify is a no-op on server side
- **Category**: XSS
- **Status**: [x] Fixed (2026-03-02) — swapped dompurify for isomorphic-dompurify
- **File**: `src/lib/utils/sanitize.ts:4`
- **Risk**: `sanitizeHtml()` returns raw HTML when `typeof window === "undefined"`. Any server-side caller gets zero sanitization. Combined with H3, AI-generated HTML goes to DB unsanitized.
- **Fix**: Use `isomorphic-dompurify` or `dompurify` + `jsdom` for server-side sanitization. Remove the `typeof window` guard.

### H3. POST /api/listings has no Zod schema for content
- **Category**: Input validation
- **Status**: [x] Fixed (2026-03-02) — added saveListingSchema with full ListingContent validation + sanitization
- **File**: `src/app/api/listings/route.ts:47-53`
- **Risk**: `content` is cast with `as { marketplace?: string; content?: ListingContent }` and written to DB without structural validation. Accepts arbitrary nested JSON.
- **Fix**: Add a Zod schema for the save-listing endpoint in `contracts.ts`. Validate `content` structure (title string, bullets array, etc.) before DB insert.

### H4. jsPDF has 3 high-severity CVEs
- **Category**: Dependencies
- **Status**: [x] Fixed (2026-03-02) — upgraded jspdf 4.1.0 → 4.2.0
- **Package**: `jspdf <=4.1.0`
- **CVEs**:
  - GHSA-p5xg-68wr-hm3m — PDF injection via AcroForm (arbitrary JS execution)
  - GHSA-9vjf-qc39-jprp — PDF object injection via addJS
  - GHSA-67pg-wm7f-q7fj — DoS via malicious GIF dimensions
- **Risk**: Listing content exported to PDF could trigger JS execution in PDF viewers.
- **Fix**: Upgraded jspdf to 4.2.0 which patches all three CVEs.

### H5. CSRF fails open when env var is unset
- **Category**: Security patterns
- **Status**: [x] Fixed (2026-03-02)
- **File**: `src/lib/api/csrf.ts:19-24`
- **Risk**: If `NEXT_PUBLIC_APP_URL` is accidentally removed during deployment, CSRF protection silently disables for every mutation route.
- **Fix**: Fail closed in production (`NODE_ENV === "production"` rejects when env var is missing or invalid). Dev mode still fails open for DX.

---

## Medium Severity

### M1. 9 mutation routes lack rate limiting
- **Category**: Rate limiting
- **Status**: [x] Fixed (2026-03-02)
- **Routes missing limiters**:
  - `POST /api/chat` (create conversation)
  - `DELETE /api/chat/[id]`
  - `POST /api/listings` (save listing)
  - `DELETE /api/listings/[id]`
  - `PATCH /api/listings/[id]`
  - `POST /api/listings/[id]/export` (CPU-intensive PDF generation)
  - `POST /api/subscription/checkout` (calls Stripe API)
  - `POST /api/subscription/portal` (calls Stripe API)
  - `POST /api/auth/logout`
- **Risk**: Export route is most concerning — PDF generation is CPU-intensive. Stripe routes could exhaust Stripe API quota.
- **Fix**: Add `getStandardLimiter().limit(user.id)` to each handler. Use `getStrictLimiter()` for export and Stripe routes.

### M2. Stripe checkout error leaks env var naming convention
- **Category**: Data exposure
- **Status**: [x] Fixed (2026-03-02)
- **File**: `src/app/api/subscription/checkout/route.ts:54-57`
- **Risk**: Error response includes `Set STRIPE_PRICE_${plan_id}_${interval} env var`, revealing internal naming.
- **Fix**: Replace with a generic "Pricing not configured. Please contact support." message.

### M3. Password policy only requires 6 characters
- **Category**: Input validation
- **Status**: [x] Fixed (2026-03-02)
- **File**: `src/lib/api/contracts.ts` — `signupSchema`, `updatePasswordSchema`
- **Risk**: Users can set trivially guessable passwords like "123456".
- **Fix**: Shared `strongPassword` schema: min 8 chars, max 128, requires lowercase + uppercase + digit. Login schema keeps min 1 so existing users with weak passwords can still sign in.

### M4. IP spoofing via X-Forwarded-For
- **Category**: Rate limiting
- **Status**: [x] Fixed (2026-03-02)
- **File**: `src/lib/api/rate-limit.ts:57-70`
- **Risk**: `getIP()` trusts `x-forwarded-for` without validation. Safe on Vercel (which strips/rewrites these headers) but risky if deployed behind a different proxy.
- **Fix**: Documented the Vercel dependency in the JSDoc for `getIP()` with guidance for non-Vercel deployments.

### M5. No session invalidation on password change
- **Category**: Auth
- **Status**: [x] Fixed (2026-03-02)
- **Risk**: After password reset, existing sessions on other devices remain active. Supabase limitation.
- **Fix**: Created `POST /api/auth/update-password` route that updates the password via `supabase.auth.updateUser()` then calls `signOut({ scope: "others" })` to invalidate all other sessions. Uses strict rate limiter, CSRF, and the strong password schema.

### M6. GA_ID interpolated into inline script unescaped
- **Category**: Env exposure
- **Status**: [x] Fixed (2026-03-02)
- **File**: `src/app/layout.tsx:50`
- **Risk**: If `NEXT_PUBLIC_GA_ID` contained a single quote or script-breaking characters, it could cause script injection. Requires control over env vars.
- **Fix**: Used `JSON.stringify()` for the inline script value and `encodeURIComponent()` for the script src URL.

### M7. sanitizeHtml() never called on AI content storage path
- **Category**: XSS
- **Status**: [x] Fixed (2026-03-02) — added sanitizeListingContent() to all 5 storage paths
- **Files**: All listing creation routes — generate, chat/messages, refine, repurpose, batch/processor
- **Risk**: AI-generated content (especially eBay HTML descriptions) goes to DB unsanitized. React auto-escapes on render, but any future `dangerouslySetInnerHTML` use on listing content would be immediately exploitable.
- **Fix**: Add a sanitization pass before DB insert in all listing creation paths. Depends on H2 (server-side DOMPurify) being fixed first.

---

## Low Severity

### L1. Missing max length on multiple input fields
- **Category**: Input validation
- **Status**: [x] Fixed (2026-03-02)
- **File**: `src/lib/api/contracts.ts`
- **Fields**: `auditSchema`, `optimizeSchema`, `rewriteFieldSchema.listing`, `createConversationSchema.title`, `auditAPlusModule`, `batchRowSchema`, `generateListingSchema.condition`
- **Fix**: Added `.max()` constraints: titles 500, descriptions 10000, bullets 1000×20, backend_keywords 2000, conditions 200, A+ module fields capped, conversation title 200.

### L2. Subscription route returns Stripe IDs to client
- **Category**: Data exposure
- **Status**: [x] Fixed (2026-03-02)
- **File**: `src/app/api/subscription/route.ts:43-44`
- **Fix**: Replaced `stripe_customer_id` and `stripe_subscription_id` with a boolean `has_subscription` flag. Updated billing page to use the new field.

### L3. Login returns full Supabase User object
- **Category**: Data exposure
- **Status**: [x] Fixed (2026-03-02)
- **File**: `src/app/api/auth/login/route.ts:35`
- **Fix**: Return only `{ id, email }` instead of the full `data.user` object.

### L4. CSV uploads only check extension, not MIME type
- **Category**: File upload
- **Status**: [x] Fixed (2026-03-02)
- **Files**: `src/app/api/listings/import/route.ts`, `src/app/api/batch/route.ts`
- **Fix**: Added MIME type check (`file.type !== "text/csv"`) alongside extension check. Allows empty type (some clients don't set it) but rejects mismatched types.

### L5. Webhook secret captured at module scope
- **Category**: Security patterns
- **Status**: [x] Fixed (2026-03-02)
- **File**: `src/app/api/webhooks/stripe/route.ts:9`
- **Fix**: Replaced module-scope `const` with `getWebhookSecret()` lazy getter, consistent with other external client patterns.

### L6. No explicit Supabase cookie security options
- **Category**: Security patterns
- **Status**: [x] Fixed (2026-03-02)
- **File**: `src/lib/supabase/server.ts`
- **Fix**: Explicitly set `httpOnly: true`, `secure: true` (production only), `sameSite: 'lax'` in `setAll` cookie config.

### L7. Blog page uses dangerouslySetInnerHTML
- **Category**: XSS
- **Status**: [x] Fixed (2026-03-02)
- **File**: `src/app/(public)/blog/amazon-banned-words/page.tsx:530`
- **Risk**: Not exploitable — content is hardcoded JSON-LD. Flagged for awareness only.
- **Fix**: Replaced `dangerouslySetInnerHTML` with a `{JSON.stringify()}` child text node inside the `<script>` tag.

---

## Already Completed

- [x] Security response headers (CSP, HSTS, X-Frame-Options, etc.) — `next.config.ts`
- [x] CSRF origin checking on all 22 mutation handlers — `src/lib/api/csrf.ts`
- [x] CSRF exemptions for Chrome extension audit route and Stripe webhook
- [x] 104 CSRF tests (unit + integration + stress tests)

---

## Suggested Fix Order

1. **H1** — Error message leaking (quick, high impact)
2. **H2 + M7** — Server-side sanitization + storage path (paired fix)
3. **H3** — Zod schema for listings POST
4. **M1** — Rate limiting gaps
5. **M2** — Stripe env var leak
6. **H5** — CSRF fail-closed in production
7. **H4** — jsPDF CVE upgrade
8. **M3** — Password policy
9. **L1–L7** — Low severity batch
