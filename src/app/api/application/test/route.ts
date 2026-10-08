import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { openTestBundle } from "@/lib/testBundle";

export const runtime = "nodejs";

/**
 * GET /api/application/test — returns the candidate's take-home bundle.
 *
 * The bundle is stored encrypted with a key derived from the owner's email.
 * We decrypt server-side for the authenticated owner only, then stream the
 * plaintext JSON over HTTPS. A mismatched email fails GCM authentication.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!user.emailVerified)
    return NextResponse.json({ error: "Verify your email first." }, { status: 403 });

  const app = await prisma.application.findUnique({ where: { userId: user.id } });
  if (!app?.testBundleId) {
    return NextResponse.json({ error: "No test has been issued for your account." }, { status: 404 });
  }

  try {
    const bundle = openTestBundle(app.testBundleId, user.email);
    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="gcx-challenge.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("bundle decrypt failed", err);
    return NextResponse.json({ error: "Unable to open the test bundle." }, { status: 500 });
  }
}
