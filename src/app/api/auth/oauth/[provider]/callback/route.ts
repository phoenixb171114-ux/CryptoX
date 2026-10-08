import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { PROVIDERS, exchangeCode, fetchProfile, type Provider } from "@/lib/oauth";
import { signToken, verifyToken } from "@/lib/signing";

export const runtime = "nodejs";

const STATE_COOKIE = "gcx_oauth_state";
const PENDING_COOKIE = "gcx_oauth_pending";

/**
 * GET /api/auth/oauth/:provider/callback — provider redirects back here.
 * We exchange the code, read the identity (and email, when the provider gives
 * one), then hand off to the mandatory password step.
 */
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const provider = params.provider as Provider;
  const base = req.nextUrl.origin;
  const fail = (reason: string) => NextResponse.redirect(`${base}/login?oauth=${reason}`);

  if (!PROVIDERS.includes(provider)) return fail("unknown");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = verifyToken<{ state: string; mode: string; provider: string; verifier: string }>(
    cookies().get(STATE_COOKIE)?.value
  );
  cookies().delete(STATE_COOKIE);

  // CSRF / integrity checks.
  if (!code || !state || !stateCookie) return fail("state");
  if (stateCookie.provider !== provider || stateCookie.state !== state) return fail("state");

  let profile;
  try {
    const accessToken = await exchangeCode(provider, code, stateCookie.verifier);
    profile = await fetchProfile(provider, accessToken);
  } catch (err) {
    console.error("oauth callback error", (err as Error).message);
    return fail("error");
  }

  // Find the account: first by the linked provider identity, then by email.
  const linked = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId },
    },
  });
  let user = linked ? await prisma.user.findUnique({ where: { id: linked.userId } }) : null;
  if (!user && profile.email) {
    user = await prisma.user.findUnique({ where: { email: profile.email } });
  }

  let pending: string;
  let mode: "login" | "signup";
  let needEmail = false;

  if (user) {
    mode = "login";
    pending = signToken(
      { kind: "login", userId: user.id, provider, providerAccountId: profile.providerAccountId },
      900
    );
  } else {
    mode = "signup";
    needEmail = !profile.email;
    pending = signToken(
      {
        kind: "signup",
        provider,
        providerAccountId: profile.providerAccountId,
        email: profile.email ?? "",
        emailVerified: profile.emailVerified,
        name: profile.name ?? "",
        needEmail,
      },
      900
    );
  }

  cookies().set(PENDING_COOKIE, pending, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 900,
  });

  const q = new URLSearchParams({ mode, provider });
  if (user?.email) q.set("email", user.email);
  else if (profile.email) q.set("email", profile.email);
  if (needEmail) q.set("needEmail", "1");

  return NextResponse.redirect(`${base}/oauth/finish?${q.toString()}`);
}
