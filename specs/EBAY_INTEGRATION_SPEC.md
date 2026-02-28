# SellerAide — eBay Integration Spec (Option A)

**Goal:** Generate eBay listings in SellerAide, preview/edit in-app, publish to eBay with one click.
**Key Insight:** eBay API has NO draft/Seller Hub drafts support. The "draft" lives in SellerAide.

---

## Architecture

```
User generates listing → SellerAide stores as "eBay Draft" in Supabase
→ User reviews/edits in SellerAide UI
→ User clicks "Publish to eBay"
→ API: createInventoryItem → createOffer → publishOffer
→ Listing is LIVE on eBay
```

---

## Prerequisites (One-Time Setup)

### 1. eBay OAuth (already done)
- App credentials in Vercel env vars
- OAuth flow: user connects eBay account via OAuth consent
- Store `access_token` + `refresh_token` per user in Supabase

### 2. Business Policies (per-user, first-time)
Before ANY listing can publish, the user's eBay account must have:
- **Payment policy** (managed payments — usually auto-enabled)
- **Fulfillment policy** (shipping rules)
- **Return policy**

**Implementation:** On first eBay connection, call Account API to check if policies exist:
```
GET /sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US
GET /sell/account/v1/return_policy?marketplace_id=EBAY_US
GET /sell/account/v1/payment_policy?marketplace_id=EBAY_US
```
If missing, prompt user to create them on eBay first (link to Seller Hub > Business Policies). We do NOT create policies for them — too risky, too many seller-specific choices.

### 3. Inventory Location (per-user, first-time)
Every offer needs a `merchantLocationKey`. Create one default location per user:
```
POST /sell/inventory/v1/inventory_location/{merchantLocationKey}
{
  "location": {
    "address": {
      "stateOrProvince": "MI",
      "country": "US"  
    }
  },
  "merchantLocationStatus": "ENABLED",
  "locationTypes": ["WAREHOUSE"]
}
```
Use a key like `selleraide-default`. Only needs state + country (not full address).

---

## Database Schema Changes

### `ebay_connections` table
```sql
CREATE TABLE ebay_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  ebay_user_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  merchant_location_key TEXT,
  fulfillment_policy_id TEXT,
  return_policy_id TEXT,
  payment_policy_id TEXT,
  policies_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Add to `listings` table
```sql
ALTER TABLE listings ADD COLUMN ebay_status TEXT DEFAULT 'none';
-- Values: 'none' | 'draft' | 'publishing' | 'live' | 'error'
ALTER TABLE listings ADD COLUMN ebay_offer_id TEXT;
ALTER TABLE listings ADD COLUMN ebay_listing_id TEXT;
ALTER TABLE listings ADD COLUMN ebay_sku TEXT;
ALTER TABLE listings ADD COLUMN ebay_error TEXT;
ALTER TABLE listings ADD COLUMN ebay_published_at TIMESTAMPTZ;
```

---

## API Routes

### `POST /api/ebay/auth` — OAuth initiation
Redirect user to eBay OAuth consent screen.

### `GET /api/ebay/callback` — OAuth callback
Exchange code for tokens, store in `ebay_connections`.

### `POST /api/ebay/refresh` — Token refresh
eBay tokens expire in 2 hours. Refresh before API calls.
```
POST https://api.ebay.com/identity/v1/oauth2/token
grant_type=refresh_token
```

### `GET /api/ebay/policies` — Check business policies
Verify user has fulfillment, return, and payment policies.
Returns: `{ policiesReady: boolean, missing: string[] }`

### `POST /api/ebay/setup-location` — Create default inventory location
Creates `selleraide-default` location if it doesn't exist.

### `POST /api/ebay/publish` — The main event
Request body: `{ listingId: string }`

This does 3 API calls in sequence:

**Step 1: Create Inventory Item**
```
PUT /sell/inventory/v1/inventory_item/{sku}
{
  "availability": {
    "shipToLocationAvailability": {
      "quantity": <quantity>
    }
  },
  "condition": "<CONDITION_ENUM>",
  "product": {
    "title": "<listing title>",
    "description": "<listing description>",  
    "aspects": { ... },
    "imageUrls": ["https://..."]
  }
}
```
- SKU: generate unique like `SA-{listingId}-{timestamp}`
- Condition: map from SellerAide condition field → eBay enum (NEW, LIKE_NEW, VERY_GOOD, GOOD, ACCEPTABLE)
- Images: must be HTTPS URLs (use eBay's UploadSiteHostedPictures Trading API call, OR user's existing image URLs)

**Step 2: Create Offer**
```
POST /sell/inventory/v1/offer
{
  "sku": "<sku>",
  "marketplaceId": "EBAY_US",
  "format": "FIXED_PRICE",
  "availableQuantity": <quantity>,
  "categoryId": "<ebay_category_id>",
  "listingDescription": "<full HTML description>",
  "listingPolicies": {
    "fulfillmentPolicyId": "<from ebay_connections>",
    "returnPolicyId": "<from ebay_connections>",
    "paymentPolicyId": "<from ebay_connections>"
  },
  "merchantLocationKey": "selleraide-default",
  "pricingSummary": {
    "price": {
      "currency": "USD",
      "value": "<price>"
    }
  }
}
```
- `categoryId`: user selects or we suggest via eBay Taxonomy API
- Returns: `{ offerId: "..." }`

**Step 3: Publish Offer**
```
POST /sell/inventory/v1/offer/{offerId}/publish
```
- Returns: `{ listingId: "..." }` — this is the live eBay listing ID
- Update listing record: `ebay_status='live'`, `ebay_listing_id`, `ebay_published_at`

### Error Handling
- If Step 1 fails → set `ebay_status='error'`, store error, stop
- If Step 2 fails → delete inventory item, set error, stop  
- If Step 3 fails → offer exists but unpublished. User can retry publish.
- Common errors: missing policies, invalid category, image URL issues

---

## UI Changes

### Listing Detail Page — eBay Section
After generating a listing, show an "eBay" panel:
- **Not connected:** "Connect your eBay account" button → OAuth flow
- **Connected, no policies:** "Set up Business Policies on eBay first" with link
- **Ready:** Show listing preview with:
  - Title (editable)
  - Description (editable)  
  - Price (editable, required)
  - Quantity (editable, default 1)
  - Condition (dropdown)
  - Category (searchable dropdown via eBay Taxonomy API)
  - "Publish to eBay" button
- **Publishing:** Spinner + "Publishing to eBay..."
- **Live:** Green badge + link to eBay listing
- **Error:** Red badge + error message + "Retry" button

### eBay Category Selector
```
GET /sell/taxonomy/v1/category_tree/0/get_category_suggestions?q=<search>
```
Let user search/browse eBay categories. Store selected category for future listings in same product type.

---

## eBay API Scopes Needed
- `https://api.ebay.com/oauth/api_scope/sell.inventory` — create/manage inventory
- `https://api.ebay.com/oauth/api_scope/sell.account` — read business policies
- `https://api.ebay.com/oauth/api_scope/sell.fulfillment` — order management (future)

---

## Implementation Order

### Phase 1: OAuth + Setup (do first)
1. eBay OAuth flow (auth route + callback)
2. Token storage + refresh logic
3. Policy check endpoint
4. Inventory location setup
5. "Connect eBay" button on settings page

### Phase 2: Publish Flow
6. Listing → eBay field mapping
7. Category selector (Taxonomy API)
8. Create inventory item endpoint
9. Create offer endpoint  
10. Publish offer endpoint
11. Combined "Publish to eBay" endpoint (all 3 steps)

### Phase 3: UI
12. eBay panel on listing detail page
13. Price/quantity/condition inputs
14. Publish button + status badges
15. Error handling + retry

---

## Common Pitfalls (Why CC Hit Walls)

1. **No drafts API** — eBay doesn't support it. Stop trying.
2. **Business policies required** — can't publish without them. Check first.
3. **Inventory location required** — easy to forget. Create on first connect.
4. **Token refresh** — eBay tokens expire in 2 hours. Always refresh before calls.
5. **Image URLs must be HTTPS** — self-hosted images need SSL.
6. **Category required for offer** — can't skip it.
7. **Condition enum is strict** — must use exact eBay values.
8. **Sandbox ≠ Production** — different URLs, different test users. Test in sandbox first.

---

## Env Vars (already in Vercel)
```
EBAY_CLIENT_ID=<app id>
EBAY_CLIENT_SECRET=<app secret>
EBAY_REDIRECT_URI=<oauth callback url>
EBAY_ENVIRONMENT=PRODUCTION  # or SANDBOX for testing
```
