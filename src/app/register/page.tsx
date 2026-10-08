import RegisterForm from "@/components/RegisterForm";
import SocialButtons from "@/components/SocialButtons";

export default function RegisterPage() {
  return (
    <main className="container">
      <div className="form">
        <h1>Create your account</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          This begins your developer application. We&apos;ll email a verification link.
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
