import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createUser, findUserByEmail, findUserById, isDuplicateKeyError, linkOAuthAccount } from "@/lib/db";
import { hashPassword, verifyPassword, passwordIssues } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { verifyToken } from "@/lib/signing";
import type { Provider } from "@/lib/oauth";

export const runtime = "nodejs";

const PENDING_COOKIE = "gcx_oauth_pending";

const schema = z.object({
  password: z.string().min(1),
  confirmPassword: z.string().optional(),
  email: z.string().email().optional(), // only used when the provider gave no email
});

type Pending =
  | {
      kind: "signup";
      provider: Provider;
      providerAccountId: string;
      email: string;
      name: string;
      needEmail?: boolean;
    }
  | { kind: "login"; userId: string; provider: Provider; providerAccountId: string };

/**
 * POST /api/auth/oauth/complete — the mandatory password step.
 *  - signup: user SETS a password (enter + confirm); account is then created.
 *  - login:  user RE-ENTERS their existing password to finish signing in.
 */
export async function POST(req: NextRequest) {
  const pending = verifyToken<Pending>(cookies().get(PENDING_COOKIE)?.value);
  if (!pending) {
    return NextResponse.json({ error: "Your sign-in session expired. Please start again." }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter your password." }, { status: 400 });
  }
  const { password, confirmPassword } = parsed.data;

  // ---- Existing account: re-enter the current password ----
  if (pending.kind === "login") {
    const user = await findUserById(pending.userId);
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });

    // Link the provider now that ownership is proven via the password.
    await linkOAuthAccount(user.id, pending.provider, pending.providerAccountId);

    cookies().delete(PENDING_COOKIE);
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  }

  // ---- New account: set a password ----
  const issues = passwordIssues(password);
  if (issues.length) return NextResponse.json({ error: issues.join(" ") }, { status: 400 });
  if (confirmPassword !== undefined && confirmPassword !== password) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  // Determine the account email. Providers that don't expose one (Twitter/X)
  // require the user to enter it here.
  let email: string;
  if (pending.needEmail || !pending.email) {
    const entered = parsed.data.email?.toLowerCase().trim();
    if (!entered) {
      return NextResponse.json({ error: "Please enter your email address." }, { status: 400 });
    }
    email = entered;
  } else {
    email = pending.email;
  }

  // Guard against a race where the email was registered meanwhile.
  const clash = await findUserByEmail(email);
  if (clash) {
    cookies().delete(PENDING_COOKIE);
    return NextResponse.json({ error: "An account with this email already exists. Please sign in." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  let user;
  try {
    user = await createUser({ email, passwordHash, displayName: pending.name || null });
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    cookies().delete(PENDING_COOKIE);
    return NextResponse.json({ error: "An account with this email already exists. Please sign in." }, { status: 409 });
  }
  await linkOAuthAccount(user.id, pending.provider, pending.providerAccountId);

  cookies().delete(PENDING_COOKIE);
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
