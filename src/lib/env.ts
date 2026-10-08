/**
 * Centralised, validated environment access.
 *
 * Secrets used for cryptography are exposed via getters so they are validated
 * when first *used* (at runtime) rather than at import time. This keeps
 * `next build` working without a populated `.env`, while still failing fast
 * the moment a request actually needs a missing secret.
 */

function requireVar(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  get appUrl() {
    return optional("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  },

  get dataEncryptionKey() {
    return requireVar("DATA_ENCRYPTION_KEY");
  },
  get sessionSecret() {
    return requireVar("SESSION_SECRET");
  },

  smtp: {
    get host() {
      return optional("SMTP_HOST", "smtp.hostinger.com");
    },
    get port() {
      return Number(optional("SMTP_PORT", "465"));
    },
    get secure() {
      return optional("SMTP_SECURE", "true") === "true";
    },
    get user() {
      return optional("SMTP_USER");
    },
    get pass() {
      return optional("SMTP_PASS");
    },
  },
  mail: {
    // The single business mailbox used for all outgoing mail.
    get from() {
      return optional("MAIL_FROM", "GoodCryptoX <event@goodcryptox.com>");
    },
    get reviewInbox() {
      return optional("HIRING_REVIEW_INBOX", "event@goodcryptox.com");
    },
  },

  get deepseekApiKey() {
    return optional("DEEPSEEK_API_KEY");
  },
  get deepseekBaseUrl() {
    return optional("DEEPSEEK_BASE_URL", "https://api.deepseek.com");
  },
  get deepseekModel() {
    return optional("DEEPSEEK_MODEL", "deepseek-chat");
  },

  // Social login providers. A provider is "configured" when both id+secret are set.
  oauth: {
    google: {
      get id() {
        return optional("GOOGLE_CLIENT_ID");
      },
      get secret() {
        return optional("GOOGLE_CLIENT_SECRET");
      },
    },
    github: {
      get id() {
        return optional("GITHUB_CLIENT_ID");
      },
      get secret() {
        return optional("GITHUB_CLIENT_SECRET");
      },
    },
    linkedin: {
      get id() {
        return optional("LINKEDIN_CLIENT_ID");
      },
      get secret() {
        return optional("LINKEDIN_CLIENT_SECRET");
      },
    },
    facebook: {
      get id() {
        return optional("FACEBOOK_CLIENT_ID");
      },
      get secret() {
        return optional("FACEBOOK_CLIENT_SECRET");
      },
    },
    twitter: {
      get id() {
        return optional("TWITTER_CLIENT_ID");
      },
      get secret() {
        return optional("TWITTER_CLIENT_SECRET");
      },
    },
  },

  get requireContractApproval() {
    return optional("REQUIRE_CONTRACT_APPROVAL", "true") === "true";
  },
  get signatoryName() {
    return optional("COMPANY_SIGNATORY_NAME", "GoodCryptoX");
  },
  get signatoryTitle() {
    return optional("COMPANY_SIGNATORY_TITLE", "CEO, GoodCryptoX");
  },
  get ceoCalendarLink() {
    return optional("CEO_CALENDAR_LINK", "");
  },
};

export type Env = typeof env;
