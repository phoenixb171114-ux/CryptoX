import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { PROVIDERS, isConfigured, createAuthorization, type Provider } from "@/lib/oauth";
import { signToken } from "@/lib/signing";

export const runtime = "nodejs";

const STATE_COOKIE = "gcx_oauth_state";

/** GET /api/auth/oauth/:provider?mode=signup|login — begins the OAuth flow. */
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const provider = params.provider as Provider;
  const base = req.nextUrl.origin;

  if (!PROVIDERS.includes(provider)) {
    return NextResponse.redirect(`${base}/login?oauth=unknown`);
  }
  if (!isConfigured(provider)) {
    return NextResponse.redirect(`${base}/login?oauth=unconfigured&provider=${provider}`);
  }

  const mode = req.nextUrl.searchParams.get("mode") === "login" ? "login" : "signup";
  const state = crypto.randomBytes(16).toString("hex");
  const { url, verifier } = createAuthorization(provider, state);

  // Bind state + mode + provider (+ PKCE verifier) to a signed cookie (CSRF defence).
  cookies().set(STATE_COOKIE, signToken({ state, mode, provider, verifier }, 600), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(url);
}
