import { NextRequest } from "next/server";

function isLocalOrigin(origin: string) {
  try {
    const { hostname, protocol } = new URL(origin);
    return (
      protocol === "http:" &&
      (hostname === "localhost" || hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

/**
 * Validates that the request's Origin header matches the app's configured URL.
 * Returns `null` if allowed, or an error string if rejected.
 *
 * - No Origin header → allow (same-origin navigation or server-to-server)
 * - Origin present → compare host against NEXT_PUBLIC_APP_URL host
 * - Missing/invalid env var → block in production (fail closed), allow in dev (fail open)
 */
export function checkCsrfOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");

  // No Origin header — same-origin or server-to-server request
  if (!origin) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    if (process.env.NODE_ENV === "production") {
      console.error("[CSRF] NEXT_PUBLIC_APP_URL is not set in production — blocking request");
      return "Server configuration error";
    }
    console.warn(
      "[CSRF] NEXT_PUBLIC_APP_URL is not set — skipping origin check"
    );
    return null;
  }

  let appOrigin: string;
  try {
    appOrigin = new URL(appUrl).origin;
  } catch {
    if (process.env.NODE_ENV === "production") {
      console.error(`[CSRF] NEXT_PUBLIC_APP_URL is not a valid URL: "${appUrl}" — blocking request`);
      return "Server configuration error";
    }
    console.warn(
      `[CSRF] NEXT_PUBLIC_APP_URL is not a valid URL: "${appUrl}" — skipping origin check`
    );
    return null;
  }

  let requestOrigin: string;
  try {
    requestOrigin = new URL(origin).origin;
  } catch {
    return "Invalid request origin";
  }

  const requestUrlOrigin = request.nextUrl.origin;

  if (requestOrigin === requestUrlOrigin) {
    return null;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    isLocalOrigin(requestOrigin) &&
    isLocalOrigin(requestUrlOrigin)
  ) {
    return null;
  }

  if (requestOrigin !== appOrigin) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[CSRF] Allowing dev origin mismatch: request=${requestOrigin} requestUrl=${requestUrlOrigin} app=${appOrigin}`
      );
      return null;
    }
    return "Cross-origin request blocked";
  }

  return null;
}
