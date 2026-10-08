# GoodCryptoX — Corporate Website & AI Developer Hiring

A full-stack Next.js application for **GoodCryptoX** that combines:

1. **Company introduction** — a marketing site that invites developers to apply.
2. **AI-driven developer hiring** — a registered candidate chats with *Nova*
   (powered by DeepSeek), receives an encrypted take-home challenge,
   submits their work, is evaluated, and — on a pass — is sent a signed contract
   and a CEO-meeting invite. Nova runs these steps autonomously via tool calls.
3. **User accounts** — registration with email verification, Argon2id password
   hashing, and encrypted-at-rest sensitive data.

All transactional email is sent from the dedicated business mailboxes
(event@goodcryptox.com).

---

## Table of contents

- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Security notes](#security-notes) ← **read this re: passwords & encryption**
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [The hiring flow](#the-hiring-flow)
- [Deployment on a Hostinger VPS](#deployment-on-a-hostinger-vps) ← step by step
- [Operations](#operations)

---

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Database | Prisma ORM; SQLite by default (swappable to PostgreSQL) |
| Passwords | Argon2id via `@node-rs/argon2` (prebuilt, no native compile) |
| Encryption | AES-256-GCM + HKDF (`node:crypto`) |
| Email | Nodemailer over Hostinger SMTP |
| AI | DeepSeek via the `openai` SDK (OpenAI-compatible), model `deepseek-chat` |

## Architecture

```
src/
  app/
    page.tsx                     Company intro / careers landing
    register/  login/            Auth pages
    dashboard/                   Candidate workspace (chat + test + submit)
    api/
      auth/{register,verify,login,logout}
      application/{chat,submit,test}
  components/AssessmentChat.tsx   Candidate ↔ Nova chat UI
  lib/
    env.ts        Lazy, validated env access
    db.ts         Prisma client singleton
    crypto.ts     AES-256-GCM + HKDF helpers
    password.ts   Argon2id hashing
    auth.ts       Signed-cookie server sessions
    tokens.ts     Single-use email-verification tokens (stored hashed)
    mailer.ts     Nodemailer + branded email templates
    ai.ts         Nova: DeepSeek client, system prompt, tools, assessor loop
    hiring.ts     Contract drafting + CEO meeting + send/approval
    testBundle.ts Encrypts ./test per candidate email
    application.ts Transcript load/save (encrypted)
test/             The take-home challenge source (debugging + git)
scripts/          unpack-challenge.mjs for candidates
prisma/           schema.prisma + migrations
```

## Security notes

**Passwords are hashed, not reversibly encrypted — deliberately.**
The brief asked for "encryption rather than hashing" for passwords. We use
**Argon2id hashing** instead, because it is the correct, industry-standard
approach:

- A one-way hash cannot be reversed, so a database leak does **not** expose
  anyone's password.
- Reversible encryption would mean a single leaked key exposes *every*
  password in plaintext — a much larger blast radius. Password-storage guidance
  (OWASP, NIST) is explicit that passwords must be hashed with a slow,
  memory-hard function, never encrypted.

Real (reversible) **encryption is used where it is the right tool**:

- **Test bundles** (`./test`) are encrypted with **AES-256-GCM** using a key
  **derived from the candidate's email** (HKDF of the server master key with the
  email as context). This binds each bundle to one candidate and keeps the
  materials opaque at rest. The master key never leaves the server; the owner's
  bundle is decrypted server-side and streamed over HTTPS. A request with the
  wrong email fails GCM authentication.
- **Assessor transcripts** and messages are stored AES-256-GCM encrypted at rest.

**Social login never bypasses the password.** Sign-up/sign-in with Google,
GitHub, LinkedIn, or Facebook uses the provider only to verify the user's
identity and email. A password is always required:

- **Social sign-up** → after the provider verifies the email, the user is sent
  to a "set your password" screen and must create one before the account is
  created. Every account therefore has an Argon2id `passwordHash`.
- **Social sign-in** → the provider identifies the account, then the user must
  **re-enter** their existing password to finish signing in.
- A provider is only **linked** to an account after the password is verified,
  so a social login alone can never grant access or hijack an email.

OAuth state and the pending password step are carried in short-lived,
HMAC-signed HttpOnly cookies ([src/lib/signing.ts](src/lib/signing.ts)).

**Contracts require human approval by default.** `REQUIRE_CONTRACT_APPROVAL=true`
means that when Nova passes a candidate, the contract is drafted and sent to the
hiring inbox (`event@`) for a human to approve before it reaches the candidate.
Set it to `false` only if you truly want fully autonomous sending.

Other measures: signed HttpOnly session cookies, single-use verification tokens
stored only as SHA-256 hashes, uniform auth error messages, and defensive
parsing of tool-call arguments returned by the model.

---

## Local development

Requires **Node.js ≥ 20** (tested on Node 26).

```bash
npm install
cp .env.example .env            # then fill in values (see below)

# generate the two secrets:
node -e "console.log('DATA_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('SESSION_SECRET='      + require('crypto').randomBytes(48).toString('base64'))"

npx prisma migrate dev          # create the SQLite DB + tables
npm run dev                     # http://localhost:3000
```

Without SMTP configured, registration still succeeds (the verification email is
skipped with a logged warning); you can mark a user verified manually with
`npx prisma studio`.

## Environment variables

See `.env.example` for the annotated list. The essentials:

| Variable | Purpose |
|---|---|
| `APP_URL` | Public URL, used in email links |
| `DATABASE_URL` | `file:./dev.db` (SQLite) or a `postgresql://…` URL |
| `DATA_ENCRYPTION_KEY` | base64 of 32 random bytes — AES master key |
| `SESSION_SECRET` | base64 of 48 random bytes — cookie/token signing |
| `SMTP_*`, `MAIL_FROM` | Hostinger mailbox credentials + from-address |
| `DEEPSEEK_API_KEY` | DeepSeek API key for Nova |
| `DEEPSEEK_MODEL` | defaults to `deepseek-chat` (must support tool calling) |
| `REQUIRE_CONTRACT_APPROVAL` | `true` = human approves before send |
| `*_CLIENT_ID` / `*_CLIENT_SECRET` | OAuth credentials per provider (optional) |

### Social login setup (optional)

Create an OAuth app with each provider you want to enable and set its **redirect
/ callback URL** to `{APP_URL}/api/auth/oauth/{provider}/callback`:

| Provider | Where to register | Scopes used |
|---|---|---|
| Google | Google Cloud Console → Credentials → OAuth client ID | `openid email profile` |
| GitHub | GitHub → Settings → Developer settings → OAuth Apps | `read:user user:email` |
| LinkedIn | LinkedIn Developers → Auth (uses OpenID Connect) | `openid email profile` |
| Facebook | Meta for Developers → Facebook Login | `email public_profile` |
| Twitter/X | X Developer Portal → OAuth 2.0 (PKCE, confidential client) | `users.read tweet.read` |

Set the matching `*_CLIENT_ID` / `*_CLIENT_SECRET` in `.env`. In **production**
each button appears only once its credentials are present; in **development**
all buttons are shown (unconfigured ones are dashed) so you can see the UI while
setting up. Social login still requires the user to set/enter a password
(see Security notes).

**Twitter/X note:** X's OAuth 2.0 API does not expose an email address, so a new
user signing up with X enters their email on the password step and verifies it
through the normal email-verification flow. The other providers supply a
verified email directly.

## The hiring flow

1. Candidate registers → verifies email → signs in → lands on `/dashboard`.
2. Nova greets them and chats naturally about their background.
3. When ready, Nova calls `issue_test_project`; the server encrypts `./test`
   for that candidate and exposes a **Download challenge** button.
4. Candidate unpacks the bundle (`scripts/unpack-challenge.mjs`), solves it,
   pushes to git, and submits the repo URL.
5. Candidate tells Nova they're done; Nova discusses the approach and calls
   `finalize_decision`.
6. On a pass, `hiring.ts` drafts a signed contract + CEO meeting link and either
   emails the candidate (autonomous mode) or routes it to `event@` for approval.

---

## Deployment on a Hostinger VPS

This targets a **Hostinger VPS** (Ubuntu 22.04/24.04) running the app behind
Nginx with a Let's Encrypt certificate, managed by PM2. Replace
`goodcryptox.com` with your domain throughout.

### 0. Point DNS

In Hostinger **hPanel → Domains → DNS**, create an **A record** for `@` (and
`www`) pointing to your VPS IP address. Wait for it to propagate.

### 1. Create the business mailboxes

In hPanel → **Emails**, create the mailbox:

- `event@goodcryptox.com`

Note each mailbox password. Hostinger SMTP settings are:
`smtp.hostinger.com`, port **465**, SSL/TLS (`SMTP_SECURE="true"`). The
`SMTP_USER` is the full mailbox address and `SMTP_PASS` its password.

### 2. Connect to the VPS and install prerequisites

```bash
ssh root@YOUR_VPS_IP

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get update && apt-get install -y nodejs git nginx

# PM2 process manager
npm install -g pm2
```

> SQLite needs no extra service. For PostgreSQL instead:
> `apt-get install -y postgresql`, create a DB/user, set `DATABASE_URL`
> accordingly, and change `provider` to `postgresql` in `prisma/schema.prisma`.

### 3. Get the code onto the server

```bash
mkdir -p /var/www && cd /var/www
git clone <YOUR_REPO_URL> goodcryptox
cd goodcryptox
npm ci
```

### 4. Configure environment

```bash
cp .env.example .env
nano .env     # fill in every value

# generate the secrets:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # DATA_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"  # SESSION_SECRET
```

Set at minimum: `APP_URL="https://goodcryptox.com"`, `DATABASE_URL`,
`DATA_ENCRYPTION_KEY`, `SESSION_SECRET`, all `SMTP_*`/`MAIL_FROM`, and
`DEEPSEEK_API_KEY`.

### 5. Build & migrate

```bash
npx prisma generate
npx prisma migrate deploy      # applies migrations, creates the DB
npm run build                  # production build
```

> `.env` is read automatically by Next.js. The SQLite file lives at
> `prisma/dev.db`; ensure the process user can write to `prisma/` and to
> `storage/` (created on first bundle issue).

### 6. Run under PM2

```bash
pm2 start npm --name goodcryptox -- start   # runs `next start` on port 3000
pm2 save
pm2 startup systemd                          # follow the printed command
```

The app now listens on `http://127.0.0.1:3000`.

### 7. Nginx reverse proxy

```bash
nano /etc/nginx/sites-available/goodcryptox
```

```nginx
server {
    listen 80;
    server_name goodcryptox.com www.goodcryptox.com;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/goodcryptox /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 8. HTTPS with Let's Encrypt

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d goodcryptox.com -d www.goodcryptox.com
```

Certbot edits the Nginx config for TLS and sets up auto-renewal. Because
sessions use `Secure` cookies in production, the site **must** be served over
HTTPS — this step is required, not optional.

### 9. Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### 10. Verify

Visit `https://goodcryptox.com`, register a test account, confirm the
verification email arrives from `event@`, sign in, and chat with Nova.

### Updating a deployed instance

```bash
cd /var/www/goodcryptox
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart goodcryptox
```

---

## Operations

- **Logs:** `pm2 logs goodcryptox`
- **Restart:** `pm2 restart goodcryptox`
- **DB inspection:** `npx prisma studio` (bind to localhost / tunnel over SSH)
- **Backups:** back up `prisma/dev.db` (SQLite) or run `pg_dump` (PostgreSQL),
  and keep `DATA_ENCRYPTION_KEY` safe — without it, encrypted data (transcripts,
  test bundles) cannot be recovered.
- **Contract approvals:** when `REQUIRE_CONTRACT_APPROVAL=true`, approvals arrive
  at `HIRING_REVIEW_INBOX` (`event@`). Wire the approval action to
  `sendContractToCandidate()` in `src/lib/hiring.ts` (e.g. from an admin route)
  once you add an admin UI.

## Notes & limitations

- Nova judges submissions conversationally and from the submitted repo URL; it
  does not clone or execute candidate code server-side (by design — never run
  untrusted code on the app server). Add a sandboxed CI runner if you want
  automated test execution.
- The admin approval UI is intentionally minimal (email notification + helper
  function); extend `src/app` with an authenticated `ADMIN`-role panel as needed.
