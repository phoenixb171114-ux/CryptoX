import crypto from "node:crypto";
import { env } from "./env";

/**
 * Stateless, tamper-proof signed JSON tokens (HMAC-SHA256 with SESSION_SECRET),
 * carrying their own expiry. Used for short-lived OAuth state and the
 * "pending password step" handoff between the provider callback and the
 * set/enter-password screen. Stored in HttpOnly cookies.
 */

export function signToken(payload: Record<string, unknown>, ttlSeconds: number): string {
  const body = { ...payload, exp: Date.now() + ttlSeconds * 1000 };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  const mac = crypto.createHmac("sha256", env.sessionSecret).update(data).digest("base64url");
  return `${data}.${mac}`;
}

export function verifyToken<T = Record<string, unknown>>(token?: string | null): T | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const data = token.slice(0, i);
  const mac = token.slice(i + 1);
  const expected = crypto.createHmac("sha256", env.sessionSecret).update(data).digest("base64url");
  if (mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const obj = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as T & { exp: number };
    if (typeof obj.exp !== "number" || obj.exp < Date.now()) return null;
    return obj;
  } catch {
    return null;
  }
}
