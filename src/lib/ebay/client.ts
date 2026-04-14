/**
 * eBay API client — lazy-initialized, follows the same pattern as stripe.ts.
 *
 * Env vars (match eBay developer portal terminology):
 *   EBAY_APP_ID       — App ID (OAuth client_id)
 *   EBAY_CERT_ID      — Cert ID (OAuth client_secret)
 *   EBAY_RUNAME       — RuName (OAuth redirect_uri identifier)
 *   EBAY_ENVIRONMENT  — "PRODUCTION" | "SANDBOX"
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
    const clientId = process.env.EBAY_APP_ID;
    const clientSecret = process.env.EBAY_CERT_ID;
    const redirectUri = process.env.EBAY_RUNAME;
    const environment = (
      process.env.EBAY_ENVIRONMENT ?? "PRODUCTION"
    ).toUpperCase() as "PRODUCTION" | "SANDBOX";

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        "Missing eBay env vars: EBAY_APP_ID, EBAY_CERT_ID, EBAY_RUNAME"
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
  "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
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
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay token refresh failed (${res.status}): ${text}`);
  }

  return res.json();
}

/** Revoke an eBay token (refresh or access). Best-effort — failures are logged. */
export async function revokeEbayToken(token: string): Promise<void> {
  const cfg = getEbayConfig();
  const res = await fetch(`${cfg.apiBaseUrl}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-revocation",
      token,
    }),
  });

  if (!res.ok) {
    console.error(
      `[eBay] Token revocation failed (${res.status}):`,
      await res.text().catch(() => "")
    );
  }
}

/**
 * Get an application (client_credentials) access token for eBay APIs that
 * accept an app-only token — e.g. the Taxonomy API. Cached in-process until
 * shortly before expiry so we aren't exchanging credentials on every call.
 */
let _appTokenCache: { token: string; expiresAt: number } | null = null;

export async function getApplicationToken(): Promise<string> {
  if (_appTokenCache && _appTokenCache.expiresAt > Date.now() + 60_000) {
    return _appTokenCache.token;
  }

  const cfg = getEbayConfig();
  const res = await fetch(`${cfg.apiBaseUrl}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay app token failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  _appTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

/**
 * Fetch the authenticated seller's eBay username via the Identity API.
 * Returns null if the request fails (e.g. token missing the identity scope).
 */
export async function fetchEbayUsername(
  accessToken: string
): Promise<string | null> {
  const cfg = getEbayConfig();
  try {
    const res = await fetch(`${cfg.apiBaseUrl}/commerce/identity/v1/user/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { username?: string };
    return data.username ?? null;
  } catch {
    return null;
  }
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
