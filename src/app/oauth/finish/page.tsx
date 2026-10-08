"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function FinishForm() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = params.get("mode") === "login" ? "login" : "signup";
  const provider = params.get("provider") ?? "your provider";
  const email = params.get("email") ?? "";
  const needEmail = params.get("needEmail") === "1";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const isSignup = mode === "signup";
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/oauth/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSignup
            ? { password, confirmPassword: confirm, ...(needEmail ? { email: emailInput } : {}) }
            : { password }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error ?? "Something went wrong." });
      } else if (data.needVerify) {
        setMsg({
          type: "ok",
          text: "Account created! Check your email to verify it, then sign in.",
        });
      } else {
        router.push("/dashboard");
      }
    } catch {
      setMsg({ type: "err", text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h1>{isSignup ? "Set your password" : "Confirm your password"}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {isSignup && needEmail ? (
          <>
            {providerName} confirmed your identity. {providerName} doesn&apos;t share your
            email, so please add it below — we&apos;ll send a verification link. GoodCryptoX
            accounts always have a password too, so create one to finish.
          </>
        ) : isSignup ? (
          <>
            We verified <strong>{email}</strong> via {providerName}. For your security,
            GoodCryptoX accounts always have a password — create one to finish.
          </>
        ) : (
          <>
            {providerName} verified <strong>{email}</strong>. Re-enter your GoodCryptoX
            password to finish signing in.
          </>
        )}
      </p>

      {msg && <div className={`notice ${msg.type}`}>{msg.text}</div>}

      {isSignup && needEmail && (
        <div className="field">
          <label>Email address</label>
          <input
            type="email"
            required
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
      )}

      <div className="field">
        <label>{isSignup ? "Create a password" : "Password"}</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {isSignup && (
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            At least 10 characters, with upper, lower, and a number.
          </p>
        )}
      </div>

      {isSignup && (
        <div className="field">
          <label>Confirm password</label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
      )}

      <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
        {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}

export default function OAuthFinishPage() {
  return (
    <main className="container">
      <Suspense fallback={<div className="form">Loading…</div>}>
        <FinishForm />
      </Suspense>
    </main>
  );
}
