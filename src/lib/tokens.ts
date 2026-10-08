import { prisma } from "./db";
import { randomToken, sha256 } from "./crypto";

/**
 * Single-use verification tokens. We store only the SHA-256 of the token; the
 * raw value is emailed to the user and never persisted, so a DB leak does not
 * reveal usable tokens.
 */

const TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function createToken(userId: string, purpose: "email_verify" | "password_reset") {
  const raw = randomToken(32);
  await prisma.verificationToken.create({
    data: {
      userId,
      tokenHash: sha256(raw),
      purpose,
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
  return raw;
}

/** Consume a token; returns the userId on success, or null if invalid/expired. */
export async function consumeToken(raw: string, purpose: "email_verify" | "password_reset") {
  const tokenHash = sha256(raw);
  const token = await prisma.verificationToken.findUnique({ where: { tokenHash } });
  if (!token || token.purpose !== purpose) return null;
  if (token.consumedAt) return null;
  if (token.expiresAt < new Date()) return null;

  await prisma.verificationToken.update({
    where: { id: token.id },
    data: { consumedAt: new Date() },
  });
  return token.userId;
}
