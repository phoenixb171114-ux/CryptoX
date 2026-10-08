import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateApplication, loadTranscript, saveTranscript } from "@/lib/application";
import { runAssessorTurn, type ToolHandlers } from "@/lib/ai";
import { issueTestBundle } from "@/lib/testBundle";
import { runPassWorkflow } from "@/lib/hiring";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({ message: z.string().min(1).max(4000) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!user.emailVerified)
    return NextResponse.json({ error: "Verify your email first." }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const app = await getOrCreateApplication(user.id);
  const transcript = loadTranscript(app.transcriptEnc);

  // Seed the very first turn with a greeting context if empty.
  if (transcript.length === 0) {
    transcript.push({
      role: "user",
      content:
        `[system context] Candidate name: ${user.displayName || "(unknown)"}; email: ${user.email}. ` +
        `This is the start of the conversation. Greet them warmly and begin the assessment.`,
    });
  }
  transcript.push({ role: "user", content: parsed.data.message });

  // Tool handlers that let the AI drive the workflow autonomously.
  const handlers: ToolHandlers = {
    async issueTestProject(note: string) {
      const fresh = await prisma.application.findUnique({ where: { id: app.id } });
      if (fresh?.testBundleId) {
        return "A test bundle was already issued; do not issue another.";
      }
      const bundleId = issueTestBundle(user.email);
      await prisma.application.update({
        where: { id: app.id },
        data: { stage: "TEST_ISSUED", testBundleId: bundleId, testIssuedAt: new Date() },
      });
      return `Test bundle issued and encrypted for ${user.email}. It is now downloadable on the candidate's dashboard. Note relayed: "${note}".`;
    },
    async finalizeDecision(decision, score, summary) {
      const fresh = await prisma.application.findUnique({ where: { id: app.id } });
      if (!fresh?.submittedAt) {
        return "Cannot finalize yet: the candidate has not submitted their work. Ask them to submit the repository link first.";
      }
      if (decision === "fail") {
        await prisma.application.update({
          where: { id: app.id },
          data: { stage: "FAILED", score, evaluationNotes: summary },
        });
        return "Decision recorded: fail. Be kind and encourage them to reapply.";
      }
      await prisma.application.update({
        where: { id: app.id },
        data: { stage: "PASSED", score, evaluationNotes: summary },
      });
      return runPassWorkflow({
        applicationId: app.id,
        email: user.email,
        name: user.displayName || "",
        score,
        summary,
      });
    },
  };

  try {
    const result = await runAssessorTurn(transcript, handlers);
    transcript.push({ role: "assistant", content: result.assistantText });
    await saveTranscript(app.id, transcript);

    const refreshed = await prisma.application.findUnique({ where: { id: app.id } });
    return NextResponse.json({
      reply: result.assistantText,
      stage: refreshed?.stage,
      testAvailable: Boolean(refreshed?.testBundleId),
    });
  } catch (err) {
    console.error("assessor error", err);
    return NextResponse.json(
      { error: "The assistant is unavailable right now. Please try again in a moment." },
      { status: 502 }
    );
  }
}
