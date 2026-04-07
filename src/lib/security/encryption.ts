import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTED_VALUE_PREFIX = "ebaytok.v1";

let cachedKey: Buffer | null = null;
let cachedKeySource: string | null = null;

function getEncryptionKey(): Buffer {
  const keySource = process.env.EBAY_TOKEN_ENCRYPTION_KEY;

  if (!keySource) {
    throw new Error(
      "Missing EBAY_TOKEN_ENCRYPTION_KEY. Expected a base64-encoded 32-byte key."
    );
  }

  if (cachedKey && cachedKeySource === keySource) {
    return cachedKey;
  }

  let key: Buffer;
  try {
    key = Buffer.from(keySource, "base64");
  } catch {
    throw new Error(
      "Invalid EBAY_TOKEN_ENCRYPTION_KEY. Expected a base64-encoded 32-byte key."
    );
  }

  if (key.length !== 32) {
    throw new Error(
      "Invalid EBAY_TOKEN_ENCRYPTION_KEY. Expected a base64-encoded 32-byte key."
    );
  }

  cachedKey = key;
  cachedKeySource = keySource;
  return key;
}

export function isEncryptedValue(value: string): boolean {
  return value.startsWith(`${ENCRYPTED_VALUE_PREFIX}:`);
}

export function encryptValue(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTED_VALUE_PREFIX,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptValue(encryptedValue: string): string {
  if (!isEncryptedValue(encryptedValue)) {
    throw new Error("Value is not in the expected encrypted format.");
  }

  const [, ivBase64, authTagBase64, ciphertextBase64] =
    encryptedValue.split(":");

  if (!ivBase64 || !authTagBase64 || !ciphertextBase64) {
    throw new Error("Encrypted value is malformed.");
  }

  const key = getEncryptionKey();

  try {
    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");
    const ciphertext = Buffer.from(ciphertextBase64, "base64");

    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Failed to decrypt encrypted value.");
  }
}
