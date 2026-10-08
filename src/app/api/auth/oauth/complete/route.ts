import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, passwordIssues } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { createToken } from "@/lib/tokens";
import { sendMail, emailLayout, button } from "@/lib/mailer";
import { env } from "@/lib/env";
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
      emailVerified: boolean;
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
    const user = await prisma.user.findUnique({ where: { id: pending.userId } });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    if (!user.emailVerified) {
      return NextResponse.json({ error: "Please verify your email before signing in." }, { status: 403 });
    }

    // Link the provider now that ownership is proven via the password.
    await prisma.oAuthAccount.upsert({
      where: { provider_providerAccountId: { provider: pending.provider, providerAccountId: pending.providerAccountId } },
      update: {},
      create: { userId: user.id, provider: pending.provider, providerAccountId: pending.providerAccountId },
    });

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
  // require the user to enter it here; it then goes through email verification.
  let email: string;
  let providerVerifiedEmail = pending.emailVerified;
  if (pending.needEmail || !pending.email) {
    const entered = parsed.data.email?.toLowerCase().trim();
    if (!entered) {
      return NextResponse.json({ error: "Please enter your email address." }, { status: 400 });
    }
    email = entered;
    providerVerifiedEmail = false; // must verify via our own email flow
  } else {
    email = pending.email;
  }

  // Guard against a race where the email was registered meanwhile.
  const clash = await prisma.user.findUnique({ where: { email } });
  if (clash) {
    cookies().delete(PENDING_COOKIE);
    return NextResponse.json({ error: "An account with this email already exists. Please sign in." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: pending.name || null,
      emailVerified: providerVerifiedEmail ? new Date() : null,
      oauthAccounts: {
        create: { provider: pending.provider, providerAccountId: pending.providerAccountId },
      },
    },
  });

  cookies().delete(PENDING_COOKIE);

  // If the email wasn't provider-verified, require our email verification.
  if (!providerVerifiedEmail) {
    const raw = await createToken(user.id, "email_verify");
    const link = `${env.appUrl}/verify?token=${encodeURIComponent(raw)}`;
    try {
      await sendMail({
        to: user.email,
        from: env.mail.from,
        subject: "Verify your GoodCryptoX account",
        html: emailLayout(
          "Confirm your email",
          `<p>Thanks for signing up! Please confirm your email to activate your account.</p>
           <p>${button(link, "Verify my email")}</p>`
        ),
      });
    } catch (err) {
      console.error("verification email failed:", (err as Error).message);
    }
    return NextResponse.json({ ok: true, needVerify: true });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
