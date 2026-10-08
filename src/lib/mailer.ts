import nodemailer from "nodemailer";
import { env } from "./env";

/**
 * Transactional email via the Hostinger business mailboxes.
 * All outgoing mail uses the single business address (event@goodcryptox.com).
 */

let transporter: nodemailer.Transporter | null = null;

/** True only when a real SMTP mailbox is fully configured. */
export function smtpConfigured(): boolean {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  if (smtpConfigured()) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure, // true for 465 (SSL), false for 587 (STARTTLS)
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
    console.log(`[mail] SMTP transport ready (${env.smtp.host}:${env.smtp.port} as ${env.smtp.user}).`);
  } else {
    // No mailbox configured: don't fail or hang. Use a no-send transport and
    // print each message (plus any links) to the server console so flows like
    // email verification remain testable locally.
    transporter = nodemailer.createTransport({ jsonTransport: true });
    console.log("[mail] SMTP not configured — running in console/dev mode (emails are logged, not sent).");
  }
  return transporter;
}

/** Verify the SMTP connection/credentials (used by `npm run mail:test`). */
export async function verifySmtp(): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  if (!smtpConfigured()) return { ok: false, configured: false };
  try {
    await getTransporter().verify();
    return { ok: true, configured: true };
  } catch (err) {
    return { ok: false, configured: true, error: (err as Error).message };
  }
}

type Attachment = { filename: string; content: Buffer | string; contentType?: string };

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Attachment[];
}

export async function sendMail({ to, subject, html, text, from, replyTo, attachments }: SendArgs) {
  const transport = getTransporter();
  const fromAddr = from ?? env.mail.from;

  const info = await transport.sendMail({
    from: fromAddr,
    to,
    replyTo,
    subject,
    text: text ?? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    html,
    attachments,
  });

  // In console/dev mode, surface the message and any action links in the log.
  if (!smtpConfigured()) {
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    console.log("\n────────── [DEV EMAIL · not actually sent] ──────────");
    console.log("From:    ", fromAddr);
    console.log("To:      ", to);
    console.log("Subject: ", subject);
    if (links.length) console.log("Links:   ", links.join("\n          "));
    console.log("Set SMTP_USER + SMTP_PASS in .env to send for real.");
    console.log("─────────────────────────────────────────────────────\n");
  }

  return info;
}

/** Wraps body content in a simple branded shell. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;background:#0b0f17;font-family:Segoe UI,Arial,sans-serif;color:#e6edf6;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="font-size:20px;font-weight:700;letter-spacing:.5px;color:#4fd1c5;margin-bottom:24px;">
      GoodCrypto<span style="color:#e6edf6;">X</span>
    </div>
    <h1 style="font-size:20px;margin:0 0 16px;">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#c7d2e0;">${bodyHtml}</div>
    <hr style="border:none;border-top:1px solid #1e2636;margin:28px 0;" />
    <p style="font-size:12px;color:#6b7a90;">
      This message was sent by GoodCryptoX. If you did not expect it, you can ignore it.
    </p>
  </div>
</body></html>`;
}

export function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#4fd1c5;color:#06121a;
    text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;margin:8px 0;">${label}</a>`;
}
