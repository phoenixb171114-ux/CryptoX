"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

interface Props {
  initialMessages: Msg[];
  initialStage: string;
  testAvailable: boolean;
  hasSubmitted: boolean;
}

export default function AssessmentChat({
  initialMessages,
  initialStage,
  testAvailable,
  hasSubmitted,
}: Props) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [stage, setStage] = useState(initialStage);
  const [showTest, setShowTest] = useState(testAvailable);
  const [submitted, setSubmitted] = useState(hasSubmitted);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [note, setNote] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Grow the textarea with its content (capped by max-height in CSS).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  // Hand focus back once Nova has replied.
  useEffect(() => {
    if (!busy) inputRef.current?.focus({ preventScroll: true });
  }, [busy]);

  // Auto-start the conversation if there's no history yet.
  useEffect(() => {
    if (messages.length === 0 && !busy) {
      void send("Hi!");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setNote(null);
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setInput("");
    try {
      const res = await fetch("/api/application/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNote({ type: "err", text: data.error ?? "The assistant had a problem." });
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        if (data.stage) setStage(data.stage);
        if (data.testAvailable) setShowTest(true);
      }
    } catch {
      setNote({ type: "err", text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function submitWork(e: React.FormEvent) {
    e.preventDefault();
    setNote(null);
    try {
      const res = await fetch("/api/application/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNote({ type: "err", text: data.error ?? "Could not record submission." });
      } else {
        setSubmitted(true);
        setNote({ type: "ok", text: data.message });
      }
    } catch {
      setNote({ type: "err", text: "Network error. Please try again." });
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      {showTest && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Your take-home challenge is ready 🔐</h3>
          <p>
            The challenge is a password-protected ZIP. The password is the email address
            you signed up with. Unzip it, solve it, push your solution to a git host and
            submit the repository link.
          </p>
          <p style={{ marginTop: 12 }}>
            <a className="btn" href="/api/application/test">
              Download challenge (.zip)
            </a>
          </p>
          <details style={{ marginTop: 12 }}>
            <summary className="muted" style={{ cursor: "pointer" }}>
              Can&apos;t open the ZIP?
            </summary>
            <p className="muted" style={{ fontSize: 14, marginBottom: 0 }}>
              It uses AES-256 encryption, which the built-in Windows and macOS extractors
              don&apos;t support. Use <strong>7-Zip</strong> or <strong>WinRAR</strong> (Windows),{" "}
              <strong>Keka</strong> (macOS), or run <code>7z x gcx-challenge.zip</code>. Enter your
              email in lowercase, then start with <code>CHALLENGE.md</code>.
            </p>
          </details>

          <form onSubmit={submitWork} style={{ marginTop: 16 }}>
            <div className="field">
              <label>Submit your solution (repository URL)</label>
              <input
                type="url"
                placeholder="https://github.com/you/gcx-challenge"
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
                required
              />
            </div>
            <button className="btn secondary" type="submit">
              {submitted ? "Update submission" : "Submit solution"}
            </button>
            {submitted && (
              <span className="muted" style={{ marginLeft: 12, fontSize: 13 }}>
                Submitted — tell Nova in the chat to start the review.
              </span>
            )}
          </form>
        </div>
      )}

      {note && <div className={`notice ${note.type}`}>{note.text}</div>}

      <div className="chat">
        <div className="chat-header">
          <span className="nova-avatar" aria-hidden="true">N</span>
          <div className="chat-header-text">
            <strong>Nova</strong>
            <span className="chat-header-sub">AI hiring assistant · GoodCryptoX</span>
          </div>
          <span className="live-badge">
            <span className="live-dot" /> Live
          </span>
        </div>
        <div className="chat-log" ref={logRef}>
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.content}
            </div>
          ))}
          {busy && <div className="msg assistant">Nova is typing…</div>}
        </div>
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="Message Nova… (Shift+Enter for a new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter inserts a newline. Skip while an IME is composing.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(input);
              }
            }}
            disabled={busy}
          />
          <button className="btn" type="submit" disabled={busy}>
            Send
          </button>
        </form>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        Stage: {stage}. Your conversation is stored encrypted.
      </p>
    </div>
  );
}
