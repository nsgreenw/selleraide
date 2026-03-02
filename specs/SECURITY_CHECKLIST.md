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
- **Status**: [ ] Open
- **File**: `src/lib/utils/sanitize.ts:4`
- **Risk**: `sanitizeHtml()` returns raw HTML when `typeof window === "undefined"`. Any server-side caller gets zero sanitization. Combined with H3, AI-generated HTML goes to DB unsanitized.
- **Fix**: Use `isomorphic-dompurify` or `dompurify` + `jsdom` for server-side sanitization. Remove the `typeof window` guard.

### H3. POST /api/listings has no Zod schema for content
- **Category**: Input validation
- **Status**: [ ] Open
- **File**: `src/app/api/listings/route.ts:47-53`
- **Risk**: `content` is cast with `as { marketplace?: string; content?: ListingContent }` and written to DB without structural validation. Accepts arbitrary nested JSON.
- **Fix**: Add a Zod schema for the save-listing endpoint in `contracts.ts`. Validate `content` structure (title string, bullets array, etc.) before DB insert.

### H4. jsPDF has 3 high-severity CVEs
- **Category**: Dependencies
- **Status**: [ ] Open
- **Package**: `jspdf <=4.1.0`
- **CVEs**:
  - GHSA-p5xg-68wr-hm3m — PDF injection via AcroForm (arbitrary JS execution)
  - GHSA-9vjf-qc39-jprp — PDF object injection via addJS
  - GHSA-67pg-wm7f-q7fj — DoS via malicious GIF dimensions
- **Risk**: Listing content exported to PDF could trigger JS execution in PDF viewers.
- **Fix**: Run `npm audit fix` or upgrade jsPDF if a patched version exists. If no patch, sanitize all inputs to jsPDF methods.

### H5. CSRF fails open when env var is unset
- **Category**: Security patterns
- **Status**: [ ] Open
- **File**: `src/lib/api/csrf.ts:19-24`
- **Risk**: If `NEXT_PUBLIC_APP_URL` is accidentally removed during deployment, CSRF protection silently disables for every mutation route.
- **Fix**: Add a build-time or startup check that `NEXT_PUBLIC_APP_URL` is set. Alternatively, fail closed in production (`NODE_ENV === "production"` rejects when env var is missing).

---

## Medium Severity

### M1. 9 mutation routes lack rate limiting
- **Category**: Rate limiting
- **Status**: [ ] Open
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
- **Status**: [ ] Open
- **File**: `src/lib/api/contracts.ts` — `loginSchema`, `signupSchema`, `updatePasswordSchema`
- **Risk**: Users can set trivially guessable passwords like "123456".
- **Fix**: Require min 8 chars with at least one uppercase, one lowercase, and one digit. Consider checking against common password lists.

### M4. IP spoofing via X-Forwarded-For
- **Category**: Rate limiting
- **Status**: [ ] Open
- **File**: `src/lib/api/rate-limit.ts:58-63`
- **Risk**: `getIP()` trusts `x-forwarded-for` without validation. Safe on Vercel (which strips/rewrites these headers) but risky if deployed behind a different proxy.
- **Fix**: Document the Vercel dependency. If multi-platform deployment is planned, add trusted proxy validation.

### M5. No session invalidation on password change
- **Category**: Auth
- **Status**: [ ] Open
- **Risk**: After password reset, existing sessions on other devices remain active. Supabase limitation.
- **Fix**: Call `supabase.auth.signOut({ scope: 'global' })` after password change to invalidate all sessions. Requires adding a password-update route.

### M6. GA_ID interpolated into inline script unescaped
- **Category**: Env exposure
- **Status**: [ ] Open
- **File**: `src/app/layout.tsx:50`
- **Risk**: If `NEXT_PUBLIC_GA_ID` contained a single quote or script-breaking characters, it could cause script injection. Requires control over env vars.
- **Fix**: Use `JSON.stringify()` to escape the value, or pass via `data-*` attribute.

### M7. sanitizeHtml() never called on AI content storage path
- **Category**: XSS
- **Status**: [ ] Open
- **Files**: All listing creation routes — generate, chat/messages, refine, repurpose, batch/processor
- **Risk**: AI-generated content (especially eBay HTML descriptions) goes to DB unsanitized. React auto-escapes on render, but any future `dangerouslySetInnerHTML` use on listing content would be immediately exploitable.
- **Fix**: Add a sanitization pass before DB insert in all listing creation paths. Depends on H2 (server-side DOMPurify) being fixed first.

---

## Low Severity

### L1. Missing max length on multiple input fields
- **Category**: Input validation
- **Status**: [ ] Open
- **File**: `src/lib/api/contracts.ts`
- **Fields**: `auditSchema.title`, `auditSchema.description`, `optimizeSchema.title`, `optimizeSchema.description`, `rewriteFieldSchema.listing` sub-fields, `createConversationSchema.title`
- **Fix**: Add `.max()` constraints matching marketplace limits or reasonable defaults (e.g., 500 for titles, 10000 for descriptions).

### L2. Subscription route returns Stripe IDs to client
- **Category**: Data exposure
- **Status**: [ ] Open
- **File**: `src/app/api/subscription/route.ts:43-44`
- **Fix**: Strip `stripe_customer_id` and `stripe_subscription_id` from the response. Return only the fields the UI needs.

### L3. Login returns full Supabase User object
- **Category**: Data exposure
- **Status**: [ ] Open
- **File**: `src/app/api/auth/login/route.ts:31`
- **Fix**: Return only `{ id, email }` instead of the full `data.user` object.

### L4. CSV uploads only check extension, not MIME type
- **Category**: File upload
- **Status**: [ ] Open
- **Files**: `src/app/api/listings/import/route.ts`, `src/app/api/batch/route.ts`
- **Fix**: Also validate `file.type === "text/csv"`. The `X-Content-Type-Options: nosniff` header provides defense-in-depth.

### L5. Webhook secret captured at module scope
- **Category**: Security patterns
- **Status**: [ ] Open
- **File**: `src/app/api/webhooks/stripe/route.ts:9`
- **Fix**: Move to a lazy getter for consistency: `function getWebhookSecret() { return process.env.STRIPE_WEBHOOK_SECRET; }`.

### L6. No explicit Supabase cookie security options
- **Category**: Security patterns
- **Status**: [ ] Open
- **File**: `src/lib/supabase/server.ts`
- **Fix**: Explicitly set `httpOnly: true`, `secure: true`, `sameSite: 'lax'` in the cookie configuration rather than relying on `@supabase/ssr` defaults.

### L7. Blog page uses dangerouslySetInnerHTML
- **Category**: XSS
- **Status**: [ ] Open
- **File**: `src/app/(public)/blog/amazon-banned-words/page.tsx:532`
- **Risk**: Not exploitable — content is hardcoded JSON-LD. Flagged for awareness only.
- **Fix**: Use Next.js `<Script>` component with `strategy="afterInteractive"` or a typed JSON-LD helper.

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
