import LoginForm from "@/components/LoginForm";
import SocialButtons from "@/components/SocialButtons";

export default function LoginPage() {
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
