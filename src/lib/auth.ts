import { cookies } from "next/headers";
import crypto from "node:crypto";
import { createSessionRecord, deleteSession, findSession, findUserById } from "./db";
import { env } from "./env";

/**
 * Minimal server-side session management.
 * The cookie stores `<sessionId>.<hmac>`; the HMAC (keyed by SESSION_SECRET)
 * prevents tampering. The actual session lives in the database.
 */

const COOKIE_NAME = "gcx_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function sign(value: string): string {
  return crypto.createHmac("sha256", env.sessionSecret).update(value).digest("base64url");
}

function serialize(sessionId: string): string {
  return `${sessionId}.${sign(sessionId)}`;
}

function parse(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const idx = cookieValue.lastIndexOf(".");
  if (idx < 0) return null;
  const sessionId = cookieValue.slice(0, idx);
  const mac = cookieValue.slice(idx + 1);
  const expected = sign(sessionId);
  // Constant-time compare.
  if (mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return sessionId;
}

export async function createSession(userId: string): Promise<void> {
  const session = await createSessionRecord(userId, new Date(Date.now() + SESSION_TTL_MS));
  cookies().set(COOKIE_NAME, serialize(session.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function destroySession(): Promise<void> {
  const sessionId = parse(cookies().get(COOKIE_NAME)?.value);
  if (sessionId) {
    await deleteSession(sessionId);
  }
  cookies().delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const sessionId = parse(cookies().get(COOKIE_NAME)?.value);
  if (!sessionId) return null;

  const session = await findSession(sessionId);
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await deleteSession(sessionId);
    return null;
  }
  return findUserById(session.userId);
}

/** Throws (for route handlers) when no signed-in user is present. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Not signed in.", 401);
  }
  return user;
}

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}
