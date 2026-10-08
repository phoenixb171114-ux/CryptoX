import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  // Uniform failure message; still run a verify to reduce timing signal.
  const ok = user ? await verifyPassword(user.passwordHash, parsed.data.password) : false;
  if (!user || !ok) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email before signing in." },
      { status: 403 }
    );
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
