/**
 * Token management — ensures we always have a valid eBay access token.
 *
 * Tokens expire every 2 hours. We refresh proactively with a 5-minute buffer.
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { refreshAccessToken } from "./client";
import type { EbayConnection } from "@/types";

const BUFFER_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get a valid access token for the user. Refreshes if within 5 min of expiry.
 * Returns `null` if the user has no eBay connection.
 * Throws if the refresh fails (e.g. refresh token revoked).
 */
export async function getValidAccessToken(
  userId: string
): Promise<{ token: string; connection: EbayConnection } | null> {
  const admin = getSupabaseAdmin();

  const { data: conn, error } = await admin
    .from("ebay_connections")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !conn) return null;

  const expiresAt = new Date(conn.token_expires_at).getTime();
  const now = Date.now();

  // Token still valid — return as-is
  if (expiresAt - now > BUFFER_MS) {
    return { token: conn.access_token, connection: conn as EbayConnection };
  }

  // Refresh the token
  const tokens = await refreshAccessToken(conn.refresh_token);
  const newExpiresAt = new Date(
    Date.now() + tokens.expires_in * 1000
  ).toISOString();

  await admin
    .from("ebay_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? conn.refresh_token,
      token_expires_at: newExpiresAt,
    })
    .eq("user_id", userId);

  return {
    token: tokens.access_token,
    connection: {
      ...conn,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? conn.refresh_token,
      token_expires_at: newExpiresAt,
    } as EbayConnection,
  };
}
