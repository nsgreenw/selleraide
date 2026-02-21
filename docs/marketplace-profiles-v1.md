# SellerAide Marketplace Profiles v1 (Amazon + eBay)

Status: Draft for implementation
Owner: Cody (orchestrator)
Date: 2026-02-20

## Scope
- Active marketplaces in v1: **Amazon**, **eBay**
- Deferred: Walmart, Shopify (feature-flagged off)
- Goal: channel-native listing output with strict compliance + QA scoring

---

## 1) Product Input Contract (shared)

All generation starts from normalized product facts:
- `product_name`
- `brand`
- `category`
- `condition` (new/open_box/used/refurbished)
- `key_features[]`
- `materials[]`
- `dimensions` (optional)
- `included_items[]`
- `known_flaws[]`
- `target_buyer` (optional)
- `price_anchor` (optional)
- `keywords_seed[]` (optional)

Rules:
- Never fabricate specs not present in input.
- If required fields are missing, return `needs_more_info` with exact missing fields.

---

## 2) Amazon Profile v1

### 2.1 Output Shape (strict)
```json
{
  "marketplace": "amazon",
  "title": "string",
  "bullet_points": ["string", "string", "string", "string", "string"],
  "description": "string",
  "backend_search_terms": ["string"],
  "attributes": {
    "brand": "string",
    "material": "string|null",
    "color": "string|null",
    "size": "string|null",
    "model": "string|null",
    "condition": "string"
  },
  "compliance_notes": ["string"],
  "assumptions": ["string"]
}
```

### 2.2 Generation Rules
- Title: keyword-rich, readable, no spammy repetition.
- Bullets: 5 bullets, each unique value proposition; factual and specific.
- Description: expands bullets with buyer clarity; no fluff.
- Backend terms: relevant long-tail terms, deduplicated from title/bullets where possible.
- Must align to known Amazon constraints in profile config (char limits configurable per category/account templates).

### 2.3 Compliance Guardrails
- Block/flag special-character abuse and emoji-heavy copy.
- Block refund/guarantee style claims and unsupported superlatives.
- Block unverifiable claims ("best", "#1", "guaranteed results") unless input includes proof source.
- Block medical/safety/legal claims unless explicitly supported.
- Ensure bullets are clear, concise, and non-duplicative.

### 2.4 QA Scoring (0–100 suggested weights)
- Relevance + keyword placement: 20
- Title quality/readability: 15
- Bullet uniqueness/benefit clarity: 20
- Description depth/clarity: 15
- Compliance safety: 20
- Attribute completeness: 10

Passing thresholds:
- `>= 85`: Ready
- `70-84`: Needs revision
- `< 70`: Regenerate with strict mode

---

## 3) eBay Profile v1

### 3.1 Output Shape (strict)
```json
{
  "marketplace": "ebay",
  "title": "string",
  "subtitle": "string|null",
  "description": "string",
  "item_specifics": {
    "brand": "string|null",
    "mpn": "string|null",
    "upc": "string|null",
    "model": "string|null",
    "color": "string|null",
    "size": "string|null",
    "material": "string|null",
    "type": "string|null",
    "condition": "string"
  },
  "condition_notes": ["string"],
  "shipping_notes": "string",
  "returns_notes": "string",
  "category_hint": "string",
  "compliance_notes": ["string"],
  "assumptions": ["string"]
}
```

### 3.2 Generation Rules
- Title: max 80 characters target; front-load strongest buyer keywords.
- Description: concise, scannable, clear condition and what’s included.
- Item specifics: maximize completion from known facts (major ranking lever).
- Must explicitly include flaws/scratches/wear when `known_flaws` present.
- Include practical shipping and returns language placeholders if seller policy unknown.

### 3.3 Best Match Optimization Guardrails
- Accurate category hint required.
- Title spelling and clarity required.
- No keyword stuffing.
- Complete specifics strongly preferred; missing key specifics produce warnings.

### 3.4 QA Scoring (0–100 suggested weights)
- Title relevance + 80-char compliance: 20
- Item specifics completeness: 30
- Description clarity/accuracy: 15
- Condition transparency/flaw disclosure: 15
- Listing completeness (shipping/returns/category): 10
- Policy/compliance safety: 10

Passing thresholds:
- `>= 85`: Ready
- `70-84`: Needs revision
- `< 70`: Regenerate with strict mode

---

## 4) Model Routing Policy (v1)

- Current live writer: Gemini (existing wiring)
- Planned premium writer: **Sonnet 4.6**

Routing:
1. Draft generation: Gemini (for speed/cost in early testing)
2. Compliance rewrite/finalization: Sonnet 4.6
3. Deterministic validator/scorer: always-on, model-agnostic
4. Auto-revise loop: max 2 retries, then escalate to manual review

Config flags:
- `WRITER_PROVIDER=gemini|sonnet`
- `FINALIZER_PROVIDER=gemini|sonnet`
- `MARKETPLACE_ENABLED_AMAZON=true`
- `MARKETPLACE_ENABLED_EBAY=true`
- `MARKETPLACE_ENABLED_WALMART=false`
- `MARKETPLACE_ENABLED_SHOPIFY=false`

---

## 5) Implementation Checklist for Claude Code CLI

1. Disable Walmart/Shopify in registry + UI selectors via feature flags.
2. Tighten Amazon and eBay profile constraints in `src/lib/marketplace/`.
3. Enforce strict JSON output schemas for each marketplace.
4. Expand validator rules for compliance + missing-specifics detection.
5. Add score explanations and one-click "Fix for Amazon/eBay" actions.
6. Add model routing config for Gemini now, Sonnet-ready wiring.
7. Add tests:
   - unit: profile validators
   - unit: schema conformance
   - integration: generate -> validate -> revise loop

---

## 6) Research Notes (high-level)
- eBay official guidance emphasizes complete/accurate listings, up to 80-char titles, strong item specifics, and high-quality photos/flaw disclosure.
- Amazon updates indicate stricter bullet-point quality/compliance and less tolerance for promotional/symbol-heavy content.
- For production reliability, deterministic validation must gate every AI output.

(When implementing, keep official docs as source of truth over blogs.)
