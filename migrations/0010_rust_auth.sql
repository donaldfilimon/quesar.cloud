-- Tables for the Rust server's own authentication (server/crates/quesar-auth).
--
-- Better Auth's "session", "verification" and "passkey" tables stay untouched
-- so the Node server keeps working; a later migration drops them once the Rust
-- server has replaced it. "user" and "account" are shared and written with
-- Better Auth's column conventions.

create table if not exists auth_sessions (
  id          text primary key,
  user_id     text not null references "user" ("id") on delete cascade,
  token_hash  bytea not null unique,            -- SHA-256 of the cookie token
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  expires_at  timestamptz not null,
  ip_address  text,
  user_agent  text
);
create index if not exists auth_sessions_user_id_idx on auth_sessions (user_id);
create index if not exists auth_sessions_expires_at_idx on auth_sessions (expires_at);

create table if not exists auth_passkeys (
  id            text primary key,
  user_id       text not null references "user" ("id") on delete cascade,
  user_handle   uuid not null,                  -- WebAuthn user.id, one per user
  credential_id bytea not null unique,
  credential    jsonb not null,                 -- serialized webauthn_rs Passkey
  name          text,
  device_type   text not null check (device_type in ('singleDevice', 'multiDevice')),
  backed_up     boolean not null,
  created_at    timestamptz not null,
  last_used_at  timestamptz
);
create index if not exists auth_passkeys_user_id_idx on auth_passkeys (user_id);

create table if not exists auth_flows (
  id           text primary key,
  kind         text not null check (kind in ('oauth', 'passkey_register', 'passkey_authenticate')),
  provider     text,                            -- oauth only
  state_hash   bytea unique,                    -- oauth: SHA-256(state)
  binding_hash bytea,                           -- oauth: SHA-256(binding cookie)
  user_id      text references "user" ("id") on delete cascade,  -- passkey_register
  payload      jsonb not null,                  -- PKCE verifier, nonce, return paths, or WebAuthn state
  created_at   timestamptz not null,
  expires_at   timestamptz not null
);
create index if not exists auth_flows_expires_at_idx on auth_flows (expires_at);
