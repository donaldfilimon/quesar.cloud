-- Fixed-window rate-limit counters. Database-backed because serverless
-- instances do not share memory. `subject` is a user id or a keyed hash of a
-- client address, never a raw IP.
create table if not exists rate_limits (
  bucket       text not null,
  subject      text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (bucket, subject, window_start)
);
create index if not exists rate_limits_window_idx on rate_limits (window_start);
