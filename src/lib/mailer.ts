import nodemailer from "nodemailer";
import { env } from "./env";

/**
 * Transactional email via the Hostinger business mailboxes.
 * All outgoing mail uses the single business address (event@goodcryptox.com).
 */

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure, // true for 465, false for 587 (STARTTLS)
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
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
  return transport.sendMail({
    from: from ?? env.mail.from,
    to,
    replyTo,
    subject,
    text: text ?? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    html,
    attachments,
  });
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
