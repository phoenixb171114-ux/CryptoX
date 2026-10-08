"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function Inner() {
  const params = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const verifyState = params.get("verify");
  const oauthState = params.get("oauth");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) setErr(data.error ?? "Sign in failed.");
      else router.push("/dashboard");
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {verifyState === "success" && (
        <div className="notice ok">Email verified — you can sign in now.</div>
      )}
      {verifyState === "invalid" && (
        <div className="notice err">That verification link is invalid or expired.</div>
      )}
      {oauthState === "error" && (
        <div className="notice err">Social sign-in failed. Please try again.</div>
      )}
      {oauthState === "state" && (
        <div className="notice err">Social sign-in expired or was blocked. Please try again.</div>
      )}
      {oauthState === "unconfigured" && (
        <div className="notice err">That provider isn&apos;t enabled yet.</div>
      )}
      {err && <div className="notice err">{err}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </>
  );
}

export default function LoginForm() {
  return (
    <Suspense fallback={<div className="muted">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
