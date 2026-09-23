-- Passkeys (WebAuthn credentials) for the Better Auth passkey plugin
-- (`@better-auth/passkey`, see src/lib/auth/server.ts). Columns mirror the
-- plugin's schema and stay double-quoted camelCase, like 0001_auth.sql.
-- Rows go with their user (on delete cascade), including account deletion.

create table if not exists "passkey" (
  "id" text not null primary key,
  "name" text,
  "publicKey" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "credentialID" text not null,
  "counter" integer not null,
  "deviceType" text not null,
  "backedUp" boolean not null,
  "transports" text,
  "createdAt" timestamptz,
  "aaguid" text
);

create index if not exists "passkey_userId_idx" on "passkey" ("userId");
create index if not exists "passkey_credentialID_idx" on "passkey" ("credentialID");
