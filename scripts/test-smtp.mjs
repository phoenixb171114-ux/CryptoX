// Test your SMTP (business email) credentials.
// Usage:
//   npm run mail:test                 # just verify the connection/login
//   npm run mail:test you@example.com # verify, then send a test email there
//
// Reads SMTP_* and MAIL_FROM from .env (via `node --env-file=.env`).
import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT = "465",
  SMTP_SECURE = "true",
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
} = process.env;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error("❌ Missing SMTP config. Set SMTP_HOST, SMTP_USER and SMTP_PASS in .env.");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === "true",
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

try {
  console.log(`→ Verifying ${SMTP_USER} at ${SMTP_HOST}:${SMTP_PORT} (secure=${SMTP_SECURE})…`);
  await transporter.verify();
  console.log("✅ SMTP login OK — the server accepted your credentials.");

  const to = process.argv[2];
  if (to) {
    const info = await transporter.sendMail({
      from: MAIL_FROM || SMTP_USER,
      to,
      subject: "GoodCryptoX SMTP test ✔",
      text: "If you can read this, your business email is working.",
    });
    console.log(`✅ Test email sent to ${to} (messageId: ${info.messageId}).`);
  } else {
    console.log("ℹ️  Pass an address to also send a test email, e.g. npm run mail:test you@example.com");
  }
  process.exit(0);
} catch (err) {
  console.error("❌ SMTP test failed:", err.message);
  console.error("\nCommon causes:");
  console.error(" • Wrong mailbox password (SMTP_PASS) or username (SMTP_USER must be the full address).");
  console.error(" • Wrong host/port: Hostinger-hosted email = smtp.hostinger.com:465 (SSL);");
  console.error("   Titan email = smtp.titan.email:465. Check hPanel → Emails → Connect devices/apps.");
  console.error(" • Port 465 needs SMTP_SECURE=\"true\"; port 587 needs SMTP_SECURE=\"false\".");
  console.error(" • The From address (MAIL_FROM) must match the authenticated mailbox (SMTP_USER).");
  process.exit(1);
}
