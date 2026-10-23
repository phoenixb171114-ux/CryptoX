import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { openResume } from "@/lib/resume";

export const runtime = "nodejs";

/**
 * GET /api/profile/resume — download the signed-in user's own resume.
 *
 * The file is decrypted server-side (key derived from the owner's email) and
 * streamed back as a PDF attachment.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!user.resumeId) {
    return NextResponse.json({ error: "No resume on file." }, { status: 404 });
  }

  try {
    const pdf = openResume(user.resumeId, user.email);
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${user.resumeName || "resume.pdf"}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("resume decrypt failed", err);
    return NextResponse.json({ error: "Unable to open your resume." }, { status: 500 });
  }
}
