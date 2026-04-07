import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptValue,
  encryptValue,
  isEncryptedValue,
} from "@/lib/security/encryption";

describe("eBay token encryption", () => {
  const originalKey = process.env.EBAY_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.EBAY_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
      "base64"
    );
  });

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.EBAY_TOKEN_ENCRYPTION_KEY = originalKey;
    } else {
      delete process.env.EBAY_TOKEN_ENCRYPTION_KEY;
    }
  });

  it("encrypts and decrypts values with authenticated encryption", () => {
    const plaintext = "ebay-refresh-token";
    const encrypted = encryptValue(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(isEncryptedValue(encrypted)).toBe(true);
    expect(decryptValue(encrypted)).toBe(plaintext);
  });

  it("fails safely when the encryption key is missing", () => {
    delete process.env.EBAY_TOKEN_ENCRYPTION_KEY;

    expect(() => encryptValue("secret")).toThrow(
      "Missing EBAY_TOKEN_ENCRYPTION_KEY"
    );
  });

  it("fails safely when the encryption key length is invalid", () => {
    process.env.EBAY_TOKEN_ENCRYPTION_KEY = Buffer.alloc(16, 3).toString(
      "base64"
    );

    expect(() => encryptValue("secret")).toThrow(
      "Invalid EBAY_TOKEN_ENCRYPTION_KEY"
    );
  });

  it("rejects tampered encrypted values", () => {
    const encrypted = encryptValue("secret");
    const tampered = `${encrypted}tampered`;

    expect(() => decryptValue(tampered)).toThrow(
      "Failed to decrypt encrypted value."
    );
  });
});
