import HeroArt from "@/components/HeroArt";
import Reveal from "@/components/Reveal";
import {
  ShieldIcon,
  BellIcon,
  LockIcon,
  RocketIcon,
  SparkIcon,
  GlobeIcon,
} from "@/components/Icons";

export default function HomePage() {
  return (
    <main>
      <div className="container">
        {/* ---------------- HERO ---------------- */}
        <section className="hero">
          <div>
            <span className="badge">
              <span className="dot" /> We&apos;re hiring developers
            </span>
            <h1>
              Crypto tools people <span className="grad">actually trust.</span>
            </h1>
            <p className="lead">
              GoodCryptoX builds secure, self-custody crypto tooling — portfolio tracking,
              smart price alerts, and trading automation — around one belief: your keys and
              your data are yours. No custody games, no dark patterns.
            </p>
            <p style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a className="btn" href="/register">
                Start your application →
              </a>
              <a className="btn secondary" href="#careers">
                How hiring works
              </a>
            </p>
          </div>
          <HeroArt />
        </section>

        {/* ---------------- WHAT WE BUILD ---------------- */}
        <section className="block">
          <Reveal>
            <h2>What we build</h2>
            <p className="muted" style={{ maxWidth: 640 }}>
              Software that respects the people using it — secure by default, transparent by design.
            </p>
          </Reveal>
          <div className="grid">
            {[
              {
                icon: <ShieldIcon />,
                title: "Self-custody first",
                body: "Non-custodial by design. We connect to exchanges and wallets through scoped, read-where-possible access and never hold user funds.",
              },
              {
                icon: <BellIcon />,
                title: "Smart alerts & automation",
                body: "A rules engine that turns noisy markets into signal — price alerts, portfolio thresholds, and automations users fully control.",
              },
              {
                icon: <LockIcon />,
                title: "Security as a feature",
                body: "Encryption at rest and in transit, least-privilege access, and transparent handling of every secret. Security is product work here.",
              },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 120}>
                <div className="card">
                  {c.icon}
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------------- WHY ENGINEERS ---------------- */}
        <section className="block">
          <Reveal>
            <h2>Why engineers like it here</h2>
          </Reveal>
          <div className="grid">
            {[
              {
                icon: <RocketIcon />,
                title: "Small team, real ownership",
                body: "You'll own features end to end and see your work ship to real users quickly.",
              },
              {
                icon: <SparkIcon />,
                title: "Craft matters",
                body: "Readable diffs, honest commit history, and tests that mean something — the fundamentals that make a codebase last.",
              },
              {
                icon: <GlobeIcon />,
                title: "Remote & async",
                body: "Work where you do your best thinking. We optimise for focus, not clock-watching.",
              },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 120}>
                <div className="card">
                  {c.icon}
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------------- HIRING FLOW ---------------- */}
        <section className="block" id="careers">
          <Reveal>
            <h2>How our hiring works</h2>
            <p className="muted" style={{ maxWidth: 720 }}>
              We replaced the dreaded application form with a conversation. Here&apos;s the whole
              process, start to finish:
            </p>
          </Reveal>
          <div className="grid">
            {[
              ["01", "Register", "Create an account and verify your email. That's all we need — no résumé upload required."],
              ["02", "Talk with Nova", "Nova, our AI hiring assistant, has a friendly chat about your background. A conversation, not an interrogation."],
              ["03", "A short take-home", "You'll get a small, encrypted debugging & git challenge — about an hour. We care how you think."],
              ["04", "Offer & meet the CEO", "Pass, and we'll send a signed contract and set up an introductory call with our CEO."],
            ].map(([num, title, body], i) => (
              <Reveal key={num} delay={i * 110}>
                <div className="card">
                  <span className="step-num">{num}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p style={{ marginTop: 32 }}>
              <a className="btn" href="/register">
                Apply now — it starts with a chat →
              </a>
            </p>
          </Reveal>
        </section>
      </div>
    </main>
  );
}
