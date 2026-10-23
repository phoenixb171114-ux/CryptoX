import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";
import SocialButtons from "@/components/SocialButtons";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Already signed in: go straight to the application.
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="container">
      <div className="form">
        <h1>Sign in</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Welcome back to GoodCryptoX.
        </p>
        <LoginForm />
        <SocialButtons mode="login" />
        <p className="muted" style={{ fontSize: 13, marginTop: 18, textAlign: "center" }}>
          New here? <a href="/register">Create an account</a>
        </p>
      </div>
    </main>
  );
}
