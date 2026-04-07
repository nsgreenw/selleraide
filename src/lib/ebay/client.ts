/**
 * eBay API client — lazy-initialized, follows the same pattern as stripe.ts.
 *
 * Env vars:
 *   EBAY_CLIENT_ID      — eBay app ID (a.k.a. App ID / Client ID)
 *   EBAY_CLIENT_SECRET   — eBay cert ID (a.k.a. Cert ID / Client Secret)
 *   EBAY_REDIRECT_URI    — RuName (eBay OAuth redirect URI name)
 *   EBAY_ENVIRONMENT     — "PRODUCTION" | "SANDBOX"
 */

interface EbayConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: "PRODUCTION" | "SANDBOX";
  authBaseUrl: string;
  apiBaseUrl: string;
}

let _config: EbayConfig | null = null;

export function getEbayConfig(): EbayConfig {
  if (!_config) {
    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;
    const redirectUri = process.env.EBAY_REDIRECT_URI;
    const environment = (process.env.EBAY_ENVIRONMENT ?? "PRODUCTION") as
      | "PRODUCTION"
      | "SANDBOX";

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        "Missing eBay env vars: EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_REDIRECT_URI"
      );
    }

    const isSandbox = environment === "SANDBOX";
    _config = {
      clientId,
      clientSecret,
      redirectUri,
      environment,
      authBaseUrl: isSandbox
        ? "https://auth.sandbox.ebay.com"
        : "https://auth.ebay.com",
      apiBaseUrl: isSandbox
        ? "https://api.sandbox.ebay.com"
        : "https://api.ebay.com",
    };
  }
  return _config;
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

const SCOPES = [
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
].join(" ");

/** Build the eBay OAuth consent URL for the user to authorise our app. */
export function getOAuthConsentUrl(state: string): string {
  const cfg = getEbayConfig();
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: "code",
    redirect_uri: cfg.redirectUri,
    scope: SCOPES,
    state,
  });
  return `${cfg.authBaseUrl}/oauth2/authorize?${params.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // seconds
  token_type: string;
}

function basicAuthHeader(): string {
  const cfg = getEbayConfig();
  return `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64")}`;
}

/** Exchange an authorization code for an access + refresh token pair. */
export async function exchangeCodeForTokens(
  code: string
): Promise<TokenResponse> {
  const cfg = getEbayConfig();
  const res = await fetch(`${cfg.apiBaseUrl}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: cfg.redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay token exchange failed (${res.status}): ${text}`);
  }

  return res.json();
}

/** Refresh an expired access token using the long-lived refresh token. */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const cfg = getEbayConfig();
  const res = await fetch(`${cfg.apiBaseUrl}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: SCOPES,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay token refresh failed (${res.status}): ${text}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Authenticated API fetch wrapper
// ---------------------------------------------------------------------------

interface EbayFetchOptions {
  method?: string;
  body?: unknown;
  accessToken: string;
}

/**
 * Make an authenticated request to an eBay REST API.
 * Returns the raw Response so callers can inspect status codes.
 */
export async function ebayApiFetch(
  path: string,
  { method = "GET", body, accessToken }: EbayFetchOptions
): Promise<Response> {
  const cfg = getEbayConfig();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Language": "en-US",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(`${cfg.apiBaseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
