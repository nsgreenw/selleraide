import { NextRequest } from "next/server";

/**
 * Validates that the request's Origin header matches the app's configured URL.
 * Returns `null` if allowed, or an error string if rejected.
 *
 * - No Origin header → allow (same-origin navigation or server-to-server)
 * - Origin present → compare host against NEXT_PUBLIC_APP_URL host
 * - Missing/invalid env var → allow with console.warn (fail open)
 */
export function checkCsrfOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");

  // No Origin header — same-origin or server-to-server request
  if (!origin) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    console.warn(
      "[CSRF] NEXT_PUBLIC_APP_URL is not set — skipping origin check"
    );
    return null;
  }

  let appHost: string;
  try {
    appHost = new URL(appUrl).host;
  } catch {
    console.warn(
      `[CSRF] NEXT_PUBLIC_APP_URL is not a valid URL: "${appUrl}" — skipping origin check`
    );
    return null;
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return "Invalid request origin";
  }

  if (originHost !== appHost) {
    return "Cross-origin request blocked";
  }

  return null;
}
