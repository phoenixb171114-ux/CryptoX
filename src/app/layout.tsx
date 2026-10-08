import type { Metadata } from "next";
import "./globals.css";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "GoodCryptoX — Secure crypto tooling, built by great engineers",
  description:
    "GoodCryptoX builds secure, self-custody crypto tools. Join our team through an AI-guided developer assessment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* animated background */}
        <div className="bg-decor" aria-hidden="true">
          <span className="blob b1" />
          <span className="blob b2" />
          <span className="blob b3" />
        </div>

        <div className="container">
          <nav className="nav">
            <a href="/" aria-label="GoodCryptoX home">
              <Logo />
            </a>
            <div className="nav-links">
              <a href="/#careers">Careers</a>
              <a href="/login">Sign in</a>
              <a className="btn" href="/register">
                Apply now
              </a>
            </div>
          </nav>
        </div>

        {children}

        <footer className="footer">
          <div className="container">
            © {new Date().getFullYear()} GoodCryptoX · Contact:{" "}
            <a href="mailto:event@goodcryptox.com">event@goodcryptox.com</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
