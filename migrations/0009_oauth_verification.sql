-- No backfill: provider names and mutable user.emailVerified are not evidence.
CREATE TABLE oauth_email_verifications (
  account_id TEXT PRIMARY KEY REFERENCES "account"("id") ON DELETE CASCADE,
  email TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
