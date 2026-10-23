import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import RegisterForm from "@/components/RegisterForm";
import SocialButtons from "@/components/SocialButtons";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  // Already signed in: go straight to the application.
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="container">
      <div className="form">
        <h1>Create your account</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          This begins your developer application.
        </p>
        <RegisterForm />
        <SocialButtons mode="signup" />
        <p className="muted" style={{ fontSize: 13, marginTop: 18, textAlign: "center" }}>
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </main>
  );
}
