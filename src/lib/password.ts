import { hash, verify } from "@node-rs/argon2";

export { passwordIssues } from "./passwordPolicy";

/**
 * Password storage.
 *
 * Passwords are hashed with Argon2id (memory-hard, salted, one-way) via the
 * prebuilt N-API binding `@node-rs/argon2` (no native compile step needed).
 * This is INTENTIONALLY used instead of reversible encryption: if the database
 * leaks, hashes cannot be turned back into passwords, whereas encrypted
 * passwords would all be exposed the moment the key leaked. See README
 * "Security notes" for the rationale.
 */

// @node-rs/argon2 defaults to the Argon2id algorithm, which is what we want.
const OPTIONS = {
  memoryCost: 19456, // 19 MiB — OWASP-recommended minimum
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(hashStr: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashStr, plain);
  } catch {
    return false;
  }
}
