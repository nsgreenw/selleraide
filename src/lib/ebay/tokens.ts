/**
 * Token management — ensures we always have a valid eBay access token.
 *
 * Tokens expire every 2 hours. We refresh proactively with a 5-minute buffer.
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { refreshAccessToken } from "./client";
import {
  decryptValue,
  encryptValue,
  isEncryptedValue,
} from "@/lib/security/encryption";
import type { EbayConnection, EbayConnectionContext } from "@/types";

const BUFFER_MS = 5 * 60 * 1000; // 5 minutes

type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  legacyPlaintext: boolean;
};

function stripSensitiveFields(connection: EbayConnection): EbayConnectionContext {
  const { access_token: _accessToken, refresh_token: _refreshToken, ...safe } =
    connection;
  void _accessToken;
  void _refreshToken;
  return safe;
}

function readStoredTokens(connection: EbayConnection): StoredTokens {
  const accessToken = isEncryptedValue(connection.access_token)
    ? decryptValue(connection.access_token)
    : connection.access_token;
  const refreshToken = isEncryptedValue(connection.refresh_token)
    ? decryptValue(connection.refresh_token)
    : connection.refresh_token;

  return {
    accessToken,
    refreshToken,
    legacyPlaintext:
      !isEncryptedValue(connection.access_token) ||
      !isEncryptedValue(connection.refresh_token),
  };
}

async function bestEffortEncryptLegacyTokens(
  userId: string,
  accessToken: string,
  refreshToken: string
) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("ebay_connections")
    .update({
      access_token: encryptValue(accessToken),
      refresh_token: encryptValue(refreshToken),
    })
    .eq("user_id", userId);

  if (error) {
    console.error(
      `[eBay Tokens] Failed to migrate legacy plaintext tokens for user ${userId}:`,
      error
    );
  }
}

/**
 * Get a valid access token for the user. Refreshes if within 5 min of expiry.
 * Returns `null` if the user has no eBay connection.
 * Throws if the refresh fails (e.g. refresh token revoked).
 */
export async function getValidAccessToken(
  userId: string
): Promise<{ token: string; connection: EbayConnectionContext } | null> {
  const admin = getSupabaseAdmin();

  const { data: conn, error } = await admin
    .from("ebay_connections")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !conn) return null;

  const { accessToken, refreshToken, legacyPlaintext } = readStoredTokens(
    conn as EbayConnection
  );

  if (legacyPlaintext) {
    await bestEffortEncryptLegacyTokens(userId, accessToken, refreshToken);
  }

  const expiresAt = new Date(conn.token_expires_at).getTime();
  const now = Date.now();

  // Token still valid — return as-is
  if (expiresAt - now > BUFFER_MS) {
    return {
      token: accessToken,
      connection: stripSensitiveFields(conn as EbayConnection),
    };
  }

  // Refresh the token
  const tokens = await refreshAccessToken(refreshToken);
  const newExpiresAt = new Date(
    Date.now() + tokens.expires_in * 1000
  ).toISOString();

  const nextRefreshToken = tokens.refresh_token ?? refreshToken;
  const { error: updateError } = await admin
    .from("ebay_connections")
    .update({
      access_token: encryptValue(tokens.access_token),
      refresh_token: encryptValue(nextRefreshToken),
      token_expires_at: newExpiresAt,
    })
    .eq("user_id", userId);
  if (updateError) {
    throw new Error(`Failed to persist refreshed eBay tokens: ${updateError.message}`);
  }

  return {
    token: tokens.access_token,
    connection: {
      ...stripSensitiveFields(conn as EbayConnection),
      token_expires_at: newExpiresAt,
    },
  };
}
