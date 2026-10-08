import crypto from "node:crypto";
import { env } from "./env";

/**
 * Symmetric encryption helpers (AES-256-GCM).
 *
 * Used for:
 *  - encrypting sensitive data at rest (assessor transcripts, messages);
 *  - deriving per-user keys to encrypt the take-home test bundle.
 *
 * This is genuine (reversible) encryption. It is deliberately NOT used for
 * passwords — those are hashed one-way with Argon2id (see password.ts).
 */

const ALGO = "aes-256-gcm";

function masterKey(): Buffer {
  const key = Buffer.from(env.dataEncryptionKey, "base64");
  if (key.length !== 32) {
    throw new Error(
      "DATA_ENCRYPTION_KEY must decode to exactly 32 bytes (base64 of 32 random bytes)."
    );
  }
  return key;
}

/**
 * Derive a 32-byte key from the master key plus a context label (e.g. a user's
 * email). HKDF binds the derived key to that context so, for instance, a test
 * bundle encrypted for alice@x can only be decrypted with alice@x's derived key.
 */
export function deriveKey(context: string): Buffer {
  return Buffer.from(
    crypto.hkdfSync("sha256", masterKey(), Buffer.from("goodcryptox-salt"), Buffer.from(context), 32)
  );
}

export function encryptWithKey(plaintext: Buffer | string, key: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const data = typeof plaintext === "string" ? Buffer.from(plaintext, "utf8") : plaintext;
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Packaged as base64(iv | tag | ciphertext).
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptWithKey(packaged: string, key: Buffer): Buffer {
  const raw = Buffer.from(packaged, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]);
}

/** Encrypt/decrypt with the application master key (data at rest). */
export function encrypt(plaintext: string): string {
  return encryptWithKey(plaintext, masterKey());
}

export function decrypt(packaged: string): string {
  return decryptWithKey(packaged, masterKey()).toString("utf8");
}

/** SHA-256 hex digest, used for storing single-use token references. */
export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Cryptographically-strong URL-safe random token. */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}
