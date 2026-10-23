import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateApplication, loadTranscript } from "@/lib/application";
import AssessmentChat from "@/components/AssessmentChat";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const app = await getOrCreateApplication(user.id);
  const transcript = loadTranscript(app.transcriptEnc)
    // Hide internal system-context seed messages from the UI.
    .filter((m) => !(m.role === "user" && m.content.startsWith("[system context]")));

  return (
    <main className="container" style={{ paddingBottom: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
        <div>
          <h1 style={{ margin: 0 }}>Your application</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Signed in as {user.displayName || user.email} · stage: <span className="badge">{app.stage}</span>
          </p>
        </div>
        <form action="/api/auth/logout" method="post">
          {/* progressive enhancement: the client component also exposes logout */}
        </form>
      </div>

      <details className="card" style={{ marginTop: 20 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Your profile</summary>
        <dl className="profile-grid">
          <dt>Full name</dt>
          <dd>{user.displayName || "—"}</dd>
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Phone</dt>
          <dd>{user.phone || "—"}</dd>
          <dt>Address</dt>
          <dd>
            {[user.addressLine, user.city, user.country].filter(Boolean).join(", ") || "—"}
          </dd>
          <dt>GitHub</dt>
          <dd>
            {user.githubUrl ? (
              <a href={user.githubUrl} target="_blank" rel="noopener noreferrer">
                {user.githubUrl}
              </a>
            ) : (
              "—"
            )}
          </dd>
          <dt>Portfolio / LinkedIn</dt>
          <dd>
            {user.portfolioUrl ? (
              <a href={user.portfolioUrl} target="_blank" rel="noopener noreferrer">
                {user.portfolioUrl}
              </a>
            ) : (
              "—"
            )}
          </dd>
          <dt>Resume</dt>
          <dd>
            {user.resumeId ? (
              <a href="/api/profile/resume">{user.resumeName || "Download PDF"}</a>
            ) : (
              "—"
            )}
          </dd>
        </dl>
      </details>

      <AssessmentChat
        initialMessages={transcript}
        initialStage={app.stage}
        testAvailable={Boolean(app.testBundleId)}
        hasSubmitted={Boolean(app.submittedAt)}
      />
    </main>
  );
}
