import { NextResponse } from "next/server";
import { findApplicationByUserId } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { openTestBundle, zipTestBundle } from "@/lib/testBundle";

export const runtime = "nodejs";

/**
 * GET /api/application/test — returns the candidate's take-home bundle as a
 * password-protected ZIP (AES-256; the password is their account email).
 *
 * The bundle is stored encrypted with a key derived from the owner's email.
 * We decrypt server-side for the authenticated owner only, then re-encrypt it
 * into the ZIP. A mismatched email fails GCM authentication.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const app = await findApplicationByUserId(user.id);
  if (!app?.testBundleId) {
    return NextResponse.json({ error: "No test has been issued for your account." }, { status: 404 });
  }

  try {
    const email = user.email.toLowerCase().trim();
    const bundle = openTestBundle(app.testBundleId, email);
    const zip = await zipTestBundle(bundle, email);
    return new NextResponse(Buffer.from(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="gcx-challenge.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("bundle decrypt failed", err);
    return NextResponse.json({ error: "Unable to open the test bundle." }, { status: 500 });
  }
}
