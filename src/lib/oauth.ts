import crypto from "node:crypto";
import { env } from "./env";

/**
 * OAuth 2.0 (authorization-code) integration for Google, Facebook, LinkedIn,
 * Twitter/X, and GitHub. Providers are used ONLY to verify identity/email;
 * a password is always required (set at sign-up, re-entered at sign-in).
 *
 * Note on email: Google, LinkedIn, Facebook, and GitHub return a verified
 * email. Twitter/X (OAuth2) does NOT expose email, so for such providers we
 * collect the email on the password step and verify it via our own email flow.
 */

export type Provider = "google" | "facebook" | "linkedin" | "twitter" | "github";
export const PROVIDERS: Provider[] = ["google", "facebook", "linkedin", "twitter", "github"];

export interface OAuthProfile {
  providerAccountId: string;
  email?: string; // absent for providers that don't expose it (Twitter/X)
  emailVerified: boolean;
  name?: string;
}

interface ProviderConfig {
  label: string;
  authUrl: string;
  tokenUrl: string;
  scope: string;
  authParams?: Record<string, string>;
  usesPkce?: boolean;
  tokenAuth?: "body" | "basic"; // how client creds are sent on token exchange
  credentials: () => { id: string; secret: string };
  fetchProfile: (accessToken: string) => Promise<OAuthProfile>;
}

function redirectUri(provider: Provider): string {
  return `${env.appUrl}/api/auth/oauth/${provider}/callback`;
}

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Upstream ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

const CONFIG: Record<Provider, ProviderConfig> = {
  google: {
    label: "Google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    authParams: { access_type: "online", prompt: "select_account" },
    credentials: () => ({ id: env.oauth.google.id, secret: env.oauth.google.secret }),
    async fetchProfile(accessToken) {
      const u = await fetchJson("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return {
        providerAccountId: String(u.sub),
        email: String(u.email).toLowerCase(),
        emailVerified: Boolean(u.email_verified),
        name: u.name,
      };
    },
  },

  facebook: {
    label: "Facebook",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scope: "email public_profile",
    credentials: () => ({ id: env.oauth.facebook.id, secret: env.oauth.facebook.secret }),
    async fetchProfile(accessToken) {
      const u = await fetchJson(
        `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`
      );
      if (!u.email) throw new Error("Facebook account has no email permission granted.");
      return {
        providerAccountId: String(u.id),
        email: String(u.email).toLowerCase(),
        emailVerified: true,
        name: u.name,
      };
    },
  },

  linkedin: {
    label: "LinkedIn",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scope: "openid email profile",
    credentials: () => ({ id: env.oauth.linkedin.id, secret: env.oauth.linkedin.secret }),
    async fetchProfile(accessToken) {
      const u = await fetchJson("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return {
        providerAccountId: String(u.sub),
        email: String(u.email).toLowerCase(),
        emailVerified: Boolean(u.email_verified ?? true),
        name: u.name,
      };
    },
  },

  twitter: {
    label: "Twitter",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scope: "users.read tweet.read",
    usesPkce: true,
    tokenAuth: "basic",
    credentials: () => ({ id: env.oauth.twitter.id, secret: env.oauth.twitter.secret }),
    async fetchProfile(accessToken) {
      const res = await fetchJson("https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const u = res.data ?? res;
      // Twitter/X does not expose email via OAuth2 — collected later from the user.
      return {
        providerAccountId: String(u.id),
        emailVerified: false,
        name: u.name ?? u.username,
      };
    },
  },

  github: {
    label: "GitHub",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scope: "read:user user:email",
    credentials: () => ({ id: env.oauth.github.id, secret: env.oauth.github.secret }),
    async fetchProfile(accessToken) {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "GoodCryptoX",
      };
      const user = await fetchJson("https://api.github.com/user", { headers });
      const emails = await fetchJson("https://api.github.com/user/emails", { headers });
      const primary =
        Array.isArray(emails) &&
        (emails.find((e: any) => e.primary && e.verified) ?? emails.find((e: any) => e.verified));
      if (!primary) throw new Error("No verified email on GitHub account.");
      return {
        providerAccountId: String(user.id),
        email: String(primary.email).toLowerCase(),
        emailVerified: true,
        name: user.name ?? user.login,
      };
    },
  },
};

export function providerLabel(provider: Provider): string {
  return CONFIG[provider].label;
}

export function providesEmail(provider: Provider): boolean {
  return provider !== "twitter";
}

export function isConfigured(provider: Provider): boolean {
  const { id, secret } = CONFIG[provider].credentials();
  return Boolean(id && secret);
}

export function configuredProviders(): Provider[] {
  return PROVIDERS.filter(isConfigured);
}

function pkceChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

/**
 * Build the provider's authorization URL. Returns the URL plus a PKCE verifier
 * ("" when the provider doesn't use PKCE) to be stored in the state cookie.
 */
export function createAuthorization(provider: Provider, state: string): { url: string; verifier: string } {
  const cfg = CONFIG[provider];
  const { id } = cfg.credentials();
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri(provider),
    response_type: "code",
    scope: cfg.scope,
    state,
    ...(cfg.authParams ?? {}),
  });

  let verifier = "";
  if (cfg.usesPkce) {
    verifier = crypto.randomBytes(32).toString("base64url");
    params.set("code_challenge", pkceChallenge(verifier));
    params.set("code_challenge_method", "S256");
  }
  return { url: `${cfg.authUrl}?${params.toString()}`, verifier };
}

/** Exchange an authorization code for an access token. */
export async function exchangeCode(provider: Provider, code: string, verifier?: string): Promise<string> {
  const cfg = CONFIG[provider];
  const { id, secret } = cfg.credentials();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(provider),
    client_id: id,
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  if (cfg.tokenAuth === "basic") {
    headers.Authorization = `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
  } else {
    body.set("client_secret", secret);
  }
  if (cfg.usesPkce) {
    body.set("code_verifier", verifier ?? "");
  }

  const token = await fetchJson(cfg.tokenUrl, { method: "POST", headers, body });
  if (!token.access_token) throw new Error("No access_token returned by provider.");
  return token.access_token as string;
}

export function fetchProfile(provider: Provider, accessToken: string): Promise<OAuthProfile> {
  return CONFIG[provider].fetchProfile(accessToken);
}
