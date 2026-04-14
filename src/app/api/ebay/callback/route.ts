import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { exchangeCodeForTokens } from "@/lib/ebay/client";
import { encryptValue } from "@/lib/security/encryption";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const user = auth.user!;

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("ebay_oauth_state")?.value;

  // Validate state parameter against cookie
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(
      new URL("/settings?ebay=error&reason=invalid_state", req.url)
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      throw new Error("eBay did not return a refresh token.");
    }

    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    const admin = getSupabaseAdmin();

    const upsertResult = await admin
      .from("ebay_connections")
      .upsert(
        {
          user_id: user.id,
          access_token: encryptValue(tokens.access_token),
          refresh_token: encryptValue(tokens.refresh_token),
          token_expires_at: expiresAt,
        },
        { onConflict: "user_id" }
      )
      .select("id, user_id");

    const upsertError = upsertResult.error;
    const upsertData = upsertResult.data ?? [];

    if (upsertError) {
      const debugMsg = `upsert_error:${upsertError.code}:${encodeURIComponent((upsertError.message || "").slice(0, 80))}`;
      return NextResponse.redirect(
        new URL(`/settings?ebay=error&reason=${debugMsg}`, req.url)
      );
    }

    // Verify the row exists
    const verifyResult = await admin
      .from("ebay_connections")
      .select("id, user_id")
      .eq("user_id", user.id);

    const verifyCount = verifyResult.data?.length ?? 0;
    const verifyError = verifyResult.error?.message ?? "";

    // Encode diagnostic info into the redirect URL
    const debug = `inserted:${upsertData.length}_verified:${verifyCount}_uid:${user.id.slice(0, 8)}_verr:${encodeURIComponent(verifyError.slice(0, 40))}`;

    const res = NextResponse.redirect(
      new URL(`/settings?ebay=connected&debug=${debug}`, req.url)
    );

    res.cookies.delete("ebay_oauth_state");
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      new URL(
        `/settings?ebay=error&reason=exception:${encodeURIComponent(msg.slice(0, 100))}`,
        req.url
      )
    );
  }
}
