import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, passwordIssues } from "@/lib/password";
import { createToken } from "@/lib/tokens";
import { sendMail, emailLayout, button } from "@/lib/mailer";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  displayName: z.string().max(80).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();
  const issues = passwordIssues(parsed.data.password);
  if (issues.length) {
    return NextResponse.json({ error: issues.join(" ") }, { status: 400 });
  }

  // Do not leak whether an account exists: respond the same either way.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: { email, passwordHash, displayName: parsed.data.displayName },
    });
    const raw = await createToken(user.id, "email_verify");
    const link = `${env.appUrl}/verify?token=${encodeURIComponent(raw)}`;
    try {
      await sendMail({
        to: email,
        from: env.mail.from,
        subject: "Verify your GoodCryptoX account",
        html: emailLayout(
          "Confirm your email",
          `<p>Welcome to GoodCryptoX! Please confirm your email to activate your account.</p>
           <p>${button(link, "Verify my email")}</p>
           <p style="color:#6b7a90;font-size:13px;">Or paste this link: ${link}</p>
           <p style="color:#6b7a90;font-size:13px;">This link expires in 24 hours.</p>`
        ),
      });
    } catch (err) {
      // Don't fail signup if the mail server is briefly unreachable; the user
      // can request a new verification link later.
      console.error("verification email failed to send:", (err as Error).message);
    }
  }

  return NextResponse.json({
    ok: true,
    message: "If that email is new, a verification link is on its way. Check your inbox.",
  });
}
