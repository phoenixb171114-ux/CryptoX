import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { consumeToken } from "@/lib/tokens";

export const runtime = "nodejs";

/** GET /api/auth/verify?token=... — confirms an email, then redirects to login. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const userId = await consumeToken(token, "email_verify");
  const base = req.nextUrl.origin;

  if (!userId) {
    return NextResponse.redirect(`${base}/login?verify=invalid`);
  }
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });
  return NextResponse.redirect(`${base}/login?verify=success`);
}
