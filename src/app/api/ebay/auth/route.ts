import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkCsrfOrigin } from "@/lib/api/csrf";
import { getStandardLimiter } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { getOAuthConsentUrl } from "@/lib/ebay/client";

export async function POST(req: NextRequest) {
  const csrfError = checkCsrfOrigin(req);
  if (csrfError) return jsonError(csrfError, 403);

  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);
  const user = auth.user!;

  const { success, reset } = await getStandardLimiter().limit(user.id);
  if (!success) return jsonRateLimited(Math.ceil((reset - Date.now()) / 1000));

  // Generate random state for CSRF protection of the OAuth flow
  const state = crypto.randomUUID();

  const url = getOAuthConsentUrl(state);

  const res = jsonSuccess({ url });

  // Set state as HttpOnly cookie (10 min expiry) for callback validation
  res.cookies.set("ebay_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return res;
}
