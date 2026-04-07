import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseAdminMock, refreshAccessTokenMock } = vi.hoisted(() => ({
  getSupabaseAdminMock: vi.fn(),
  refreshAccessTokenMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}));

vi.mock("@/lib/ebay/client", () => ({
  refreshAccessToken: refreshAccessTokenMock,
}));

import { decryptValue, encryptValue } from "@/lib/security/encryption";
import { getValidAccessToken } from "@/lib/ebay/tokens";
import type { EbayConnection } from "@/types";

function buildConnection(
  overrides: Partial<EbayConnection> = {}
): EbayConnection {
  return {
    id: "conn-1",
    user_id: "user-1",
    ebay_user_id: "ebay-user-1",
    access_token: "access-token",
    refresh_token: "refresh-token",
    token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    merchant_location_key: "loc-1",
    fulfillment_policy_id: "fulfillment-1",
    return_policy_id: "return-1",
    payment_policy_id: "payment-1",
    policies_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createAdmin(connection: EbayConnection | null) {
  const single = vi.fn().mockResolvedValue({ data: connection, error: null });
  const selectEq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq: selectEq });
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });
  const from = vi.fn().mockReturnValue({ select, update });

  return {
    admin: { from },
    update,
    updateEq,
  };
}

describe("getValidAccessToken", () => {
  const originalKey = process.env.EBAY_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.EBAY_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString(
      "base64"
    );
    getSupabaseAdminMock.mockReset();
    refreshAccessTokenMock.mockReset();
  });

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.EBAY_TOKEN_ENCRYPTION_KEY = originalKey;
    } else {
      delete process.env.EBAY_TOKEN_ENCRYPTION_KEY;
    }
  });

  it("returns a decrypted access token from an encrypted row", async () => {
    const adminState = createAdmin(
      buildConnection({
        access_token: encryptValue("encrypted-access"),
        refresh_token: encryptValue("encrypted-refresh"),
      })
    );
    getSupabaseAdminMock.mockReturnValue(adminState.admin);

    const result = await getValidAccessToken("user-1");

    expect(result?.token).toBe("encrypted-access");
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    expect(adminState.update).not.toHaveBeenCalled();
    expect(result?.connection).not.toHaveProperty("access_token");
    expect(result?.connection).not.toHaveProperty("refresh_token");
  });

  it("refreshes expired tokens and persists encrypted replacements", async () => {
    const adminState = createAdmin(
      buildConnection({
        access_token: encryptValue("old-access"),
        refresh_token: encryptValue("old-refresh"),
        token_expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
      })
    );
    getSupabaseAdminMock.mockReturnValue(adminState.admin);
    refreshAccessTokenMock.mockResolvedValue({
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 7200,
      token_type: "Bearer",
    });

    const result = await getValidAccessToken("user-1");

    expect(refreshAccessTokenMock).toHaveBeenCalledWith("old-refresh");
    expect(result?.token).toBe("new-access");
    expect(adminState.update).toHaveBeenCalledTimes(1);

    const [payload] = adminState.update.mock.calls[0];
    expect(payload.access_token).not.toBe("new-access");
    expect(payload.refresh_token).not.toBe("new-refresh");
    expect(decryptValue(payload.access_token)).toBe("new-access");
    expect(decryptValue(payload.refresh_token)).toBe("new-refresh");
  });

  it("best-effort migrates legacy plaintext rows on read", async () => {
    const adminState = createAdmin(
      buildConnection({
        access_token: "legacy-access",
        refresh_token: "legacy-refresh",
      })
    );
    getSupabaseAdminMock.mockReturnValue(adminState.admin);

    const result = await getValidAccessToken("user-1");

    expect(result?.token).toBe("legacy-access");
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    expect(adminState.update).toHaveBeenCalledTimes(1);

    const [payload] = adminState.update.mock.calls[0];
    expect(decryptValue(payload.access_token)).toBe("legacy-access");
    expect(decryptValue(payload.refresh_token)).toBe("legacy-refresh");
  });
});
