"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { passwordIssues } from "@/lib/passwordPolicy";

/**
 * Two-step sign-up:
 *   1. Account — email, password + confirmation (checked in the browser
 *      before moving on).
 *   2. Profile — name, contact, address, links and the PDF resume.
 * Everything is submitted together at the end of step 2; the server re-validates
 * and, if the email/password is rejected (e.g. already registered), the form
 * returns to step 1.
 */
export default function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [resumeName, setResumeName] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  // Both steps stay mounted (so Back keeps what was typed); focus the first
  // field of step 2 when it appears.
  useEffect(() => {
    if (step === 2) nameRef.current?.focus();
  }, [step]);

  function next(e: React.FormEvent) {
    e.preventDefault();
    const issues = passwordIssues(password);
    if (issues.length) {
      setMsg({ type: "err", text: issues.join(" ") });
      return;
    }
    if (password !== confirmPassword) {
      setMsg({ type: "err", text: "Passwords do not match." });
      return;
    }
    setMsg(null);
    setStep(2);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      // Step 2's fields (incl. the resume file) plus the account from step 1.
      const body = new FormData(e.currentTarget);
      body.set("email", email);
      body.set("password", password);
      body.set("confirmPassword", confirmPassword);
      const res = await fetch("/api/auth/register", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        if (data.step === 1) setStep(1);
        setMsg({ type: "err", text: data.error ?? "Something went wrong." });
      } else {
        router.push("/dashboard");
        router.refresh(); // re-render the layout so the nav shows the profile
      }
    } catch {
      setMsg({ type: "err", text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ol className="steps" aria-label="Sign-up progress">
        <li className={step === 1 ? "active" : "done"}>
          <span className="step-num">{step === 1 ? "1" : "✓"}</span> Account
        </li>
        <li className={step === 2 ? "active" : ""}>
          <span className="step-num">2</span> Your details
        </li>
      </ol>

      {msg && <div className={`notice ${msg.type}`}>{msg.text}</div>}

      <form onSubmit={next} hidden={step !== 1}>
        <div className="field">
          <label>Email</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            At least 10 characters, with upper, lower, and a number.
          </p>
        </div>
        <div className="field">
          <label>Confirm password</label>
          <input
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={mismatch}
            style={mismatch ? { borderColor: "var(--danger)" } : undefined}
          />
          {mismatch && (
            <p style={{ fontSize: 12, marginTop: 6, color: "var(--danger)" }}>Passwords do not match.</p>
          )}
        </div>
        <button className="btn" type="submit" style={{ width: "100%" }}>
          Continue →
        </button>
      </form>

      <form onSubmit={submit} hidden={step !== 2}>
        <p className="muted" style={{ fontSize: 13, margin: "0 0 4px" }}>
          Signing up as <strong>{email}</strong>
        </p>

        <div className="field">
          <label>Full name</label>
          <input ref={nameRef} name="fullName" required maxLength={120} autoComplete="name" />
        </div>

        <div className="field">
          <label>Phone</label>
          <input name="phone" required maxLength={40} autoComplete="tel" inputMode="tel" />
        </div>

        <div className="form-row">
          <div className="field">
            <label>Country</label>
            <input name="country" required maxLength={80} autoComplete="country-name" />
          </div>
          <div className="field">
            <label>City</label>
            <input name="city" required maxLength={80} autoComplete="address-level2" />
          </div>
        </div>

        <div className="field">
          <label>Address</label>
          <input
            name="addressLine"
            required
            maxLength={200}
            autoComplete="street-address"
            placeholder="Street address"
          />
        </div>

        <div className="field">
          <label>GitHub <span className="muted">(optional)</span></label>
          <input name="githubUrl" type="url" maxLength={300} placeholder="https://github.com/you" />
        </div>

        <div className="field">
          <label>Portfolio or LinkedIn <span className="muted">(optional)</span></label>
          <input name="portfolioUrl" type="url" maxLength={300} placeholder="https://…" />
        </div>

        <div className="field">
          <label>Resume (PDF)</label>
          <input
            name="resume"
            type="file"
            required
            accept="application/pdf,.pdf"
            onChange={(e) => setResumeName(e.target.files?.[0]?.name ?? "")}
          />
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {resumeName ? `Selected: ${resumeName}` : "PDF only, up to 5 MB."}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn secondary"
            type="button"
            onClick={() => {
              setMsg(null);
              setStep(1);
            }}
            disabled={busy}
          >
            ← Back
          </button>
          <button className="btn" type="submit" disabled={busy} style={{ flex: 1, justifyContent: "center" }}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>
    </>
  );
}
