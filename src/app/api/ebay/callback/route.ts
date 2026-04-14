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

    console.log("[eBay OAuth] Upserting for user:", user.id);

    const { data: upsertData, error: upsertError } = await admin
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
      .select();

    if (upsertError) {
      console.error("[eBay OAuth] Upsert error:", upsertError);
      throw upsertError;
    }

    console.log(
      "[eBay OAuth] Upsert returned rows:",
      upsertData?.length ?? 0,
      "user_id on row:",
      upsertData?.[0]?.user_id
    );

    // Verify the row actually exists
    const { data: verify } = await admin
      .from("ebay_connections")
      .select("id, user_id")
      .eq("user_id", user.id)
      .single();
    console.log("[eBay OAuth] Verify fetch:", verify);

    const res = NextResponse.redirect(
      new URL("/settings?ebay=connected", req.url)
    );

    // Clear the OAuth state cookie
    res.cookies.delete("ebay_oauth_state");
    return res;
  } catch (err) {
    console.error("[eBay OAuth] Token exchange failed:", err);
    return NextResponse.redirect(
      new URL("/settings?ebay=error&reason=token_exchange", req.url)
    );
  }
}
