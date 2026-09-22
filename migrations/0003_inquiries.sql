-- Contact inquiries (ported from mlai `inquiries`). Public submissions; user_id
-- is set when the submitter was signed in. Read only through /admin.
create table if not exists inquiries (
  id           bigserial primary key,
  user_id      text,
  name         text not null,
  email        text not null,
  company      text not null default '',
  project_type text not null default '',
  message      text not null,
  created_at   timestamptz not null default now()
);
create index if not exists inquiries_created_at_idx on inquiries (created_at desc);
