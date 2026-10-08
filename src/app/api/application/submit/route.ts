import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateApplication } from "@/lib/application";

export const runtime = "nodejs";

const schema = z.object({ submissionUrl: z.string().url().max(500) });

/** Records the candidate's submission link; the AI evaluates it in chat. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!user.emailVerified)
    return NextResponse.json({ error: "Verify your email first." }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Please provide a valid URL." }, { status: 400 });

  const app = await getOrCreateApplication(user.id);
  if (!app.testBundleId) {
    return NextResponse.json(
      { error: "No test has been issued yet. Continue the conversation first." },
      { status: 409 }
    );
  }

  await prisma.application.update({
    where: { id: app.id },
    data: { submissionUrl: parsed.data.submissionUrl, submittedAt: new Date(), stage: "SUBMITTED" },
  });

  return NextResponse.json({
    ok: true,
    message: "Submission received. Let the assistant know in the chat so it can review your work.",
  });
}
