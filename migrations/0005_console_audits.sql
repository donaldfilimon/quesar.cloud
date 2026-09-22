-- Console chat consent and encrypted conversation audits (ported from mlai,
-- rekeyed from WorkOS subject+org to the Better Auth user id). Audit content is
-- sealed with AES-256-GCM (src/lib/server/crypto.server.ts), never plaintext.
create table if not exists chat_consents (
  user_id        text not null,
  policy_version text not null,
  consented_at   timestamptz not null,
  withdrawn_at   timestamptz,
  updated_at     timestamptz not null default now(),
  primary key (user_id, policy_version)
);

create table if not exists conversation_audits (
  id             text primary key,
  user_id        text not null,
  provider       text not null,
  model          text not null,
  policy_version text not null,
  sealed         text not null,
  content_digest text not null,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null
);
create index if not exists conversation_audits_user_created_idx on conversation_audits (user_id, created_at desc);
create index if not exists conversation_audits_expires_idx on conversation_audits (expires_at);

create table if not exists audit_access_events (
  id            bigserial primary key,
  audit_id      text,
  actor_user_id text not null,
  actor_type    text not null check (actor_type in ('user', 'admin', 'system')),
  action        text not null check (action in ('list', 'read', 'export', 'delete', 'expire')),
  reason        text,
  outcome       text not null check (outcome in ('requested', 'succeeded', 'failed')),
  occurred_at   timestamptz not null default now()
);
create index if not exists audit_access_events_audit_idx on audit_access_events (audit_id, occurred_at desc);
