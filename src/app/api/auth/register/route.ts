import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUser, findUserByEmail, isDuplicateKeyError } from "@/lib/db";
import { hashPassword, passwordIssues } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { storeResume, isPdf, RESUME_MAX_BYTES } from "@/lib/resume";

export const runtime = "nodejs";

// Applicant profile. Sign-up is multipart/form-data because it carries the
// resume file alongside these text fields.
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  confirmPassword: z.string(),
  fullName: z.string().trim().min(1, "Please enter your full name.").max(120),
  phone: z.string().trim().min(1, "Please enter a phone number.").max(40),
  country: z.string().trim().min(1, "Please enter your country.").max(80),
  city: z.string().trim().min(1, "Please enter your city.").max(80),
  addressLine: z.string().trim().min(1, "Please enter your address.").max(200),
  githubUrl: z.string().trim().url("Enter a valid GitHub URL.").max(300).optional().or(z.literal("")),
  portfolioUrl: z.string().trim().url("Enter a valid portfolio/LinkedIn URL.").max(300).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }

  // Treat every missing/non-string field as "" so the friendly min(1) messages
  // apply instead of Zod's raw "Expected string, received null".
  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };
  const parsed = schema.safeParse({
    email: str("email"),
    password: str("password"),
    confirmPassword: str("confirmPassword"),
    fullName: str("fullName"),
    phone: str("phone"),
    country: str("country"),
    city: str("city"),
    addressLine: str("addressLine"),
    githubUrl: str("githubUrl"),
    portfolioUrl: str("portfolioUrl"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue?.path[0] ?? "");
    return NextResponse.json(
      {
        error: field === "email" ? "Enter a valid email address." : issue?.message ?? "Invalid input.",
        // step 1 = account (email/password), step 2 = profile; lets the form jump back.
        step: field === "email" || field === "password" ? 1 : 2,
      },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  const issues = passwordIssues(parsed.data.password);
  if (issues.length) {
    return NextResponse.json({ error: issues.join(" "), step: 1 }, { status: 400 });
  }
  if (parsed.data.confirmPassword !== parsed.data.password) {
    return NextResponse.json({ error: "Passwords do not match.", step: 1 }, { status: 400 });
  }

  // Resume: required, PDF only, size-limited.
  const file = form.get("resume");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please attach your resume (PDF)." }, { status: 400 });
  }
  if (file.size > RESUME_MAX_BYTES) {
    return NextResponse.json({ error: "Resume must be 5 MB or smaller." }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (!isPdf(buf)) {
    return NextResponse.json({ error: "Resume must be a PDF file." }, { status: 400 });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in.", step: 1 },
      { status: 409 }
    );
  }

  const resumeId = storeResume(buf, email);
  const resumeName = sanitizeFilename(file.name) || "resume.pdf";
  const passwordHash = await hashPassword(parsed.data.password);
  const password = parsed.data.password;

  let user;
  try {
    user = await createUser({
      email,
      passwordHash,
      password,
      displayName: parsed.data.fullName,
      phone: parsed.data.phone,
      country: parsed.data.country,
      city: parsed.data.city,
      addressLine: parsed.data.addressLine,
      githubUrl: parsed.data.githubUrl || null,
      portfolioUrl: parsed.data.portfolioUrl || null,
      resumeId,
      resumeName,
    });
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    // Registered concurrently between the check above and this insert.
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in.", step: 1 },
      { status: 409 }
    );
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}

/** Keep a display-safe basename for the uploaded file (used on download). */
function sanitizeFilename(name: string): string {
  return name
    .split(/[\\/]/)
    .pop()!
    .replace(/[^\w.\- ]+/g, "_")
    .slice(0, 100);
}
