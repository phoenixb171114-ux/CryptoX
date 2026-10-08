"use client";

import { useState } from "react";

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok) setMsg({ type: "err", text: data.error ?? "Something went wrong." });
      else setMsg({ type: "ok", text: data.message });
    } catch {
      setMsg({ type: "err", text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {msg && <div className={`notice ${msg.type}`}>{msg.text}</div>}
      <div className="field">
        <label>Name (optional)</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
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
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          At least 10 characters, with upper, lower, and a number.
        </p>
      </div>
      <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
        {busy ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
