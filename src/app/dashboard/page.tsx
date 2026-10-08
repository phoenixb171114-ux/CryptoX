import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateApplication, loadTranscript } from "@/lib/application";
import AssessmentChat from "@/components/AssessmentChat";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.emailVerified) {
    return (
      <main className="container">
        <div className="form">
          <h1>Verify your email</h1>
          <p className="muted">
            We sent a verification link to <strong>{user.email}</strong>. Click it to activate
            your account, then sign in again.
          </p>
        </div>
      </main>
    );
  }

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

      <AssessmentChat
        initialMessages={transcript}
        initialStage={app.stage}
        testAvailable={Boolean(app.testBundleId)}
        hasSubmitted={Boolean(app.submittedAt)}
      />
    </main>
  );
}
