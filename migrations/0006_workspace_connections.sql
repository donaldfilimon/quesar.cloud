-- Workspace source connections (Google Drive, Microsoft SharePoint/OneDrive).
-- Only the refresh token is stored, sealed with AES-256-GCM; access tokens are
-- minted on demand and never persisted. account_email is the connected
-- provider account, distinct from the signed-in identity.
create table if not exists workspace_connections (
  user_id       text not null,
  provider      text not null check (provider in ('google', 'microsoft')),
  account_email text,
  scope         text,
  sealed        text not null,
  connected_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, provider)
);
