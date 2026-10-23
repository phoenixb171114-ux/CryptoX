import type { Metadata } from "next";
import "./globals.css";
import { Logo } from "@/components/Logo";
import UserMenu from "@/components/UserMenu";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "GoodCryptoX — Secure crypto tooling, built by great engineers",
  description:
    "GoodCryptoX builds secure, self-custody crypto tools. Join our team through an AI-guided developer assessment.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        {/* animated background */}
        <div className="bg-decor" aria-hidden="true">
          <span className="blob b1" />
          <span className="blob b2" />
          <span className="blob b3" />
        </div>

        <div className="container nav-wrap">
          <nav className="nav">
            <a href="/" aria-label="GoodCryptoX home">
              <Logo />
            </a>
            <div className="nav-links">
              <a href="https://goodcryptox.app" target="_blank" rel="noopener noreferrer">
                Our app ↗
              </a>
              <a href="/#careers">Careers</a>
              {user ? (
                <UserMenu name={user.displayName || user.email} email={user.email} />
              ) : (
                <>
                  <a href="/login">Sign in</a>
                  <a className="btn" href="/login">
                    Apply now
                  </a>
                </>
              )}
            </div>
          </nav>
        </div>

        {children}

        <footer className="footer">
          <div className="container">
            © {new Date().getFullYear()} GoodCryptoX ·{" "}
            <a href="https://goodcryptox.app" target="_blank" rel="noopener noreferrer">
              goodcryptox.app
            </a>{" "}
            · Contact:{" "}
            <a href="mailto:event@goodcryptox.tech">event@goodcryptox.tech</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
