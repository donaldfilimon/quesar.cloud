-- Anonymous page telemetry (ported from mlai `telemetry_events`). No user id,
-- no IP: only an allowlisted event name and path.
create table if not exists telemetry_events (
  id         bigserial primary key,
  event      text not null,
  path       text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists telemetry_events_created_at_idx on telemetry_events (created_at desc);
