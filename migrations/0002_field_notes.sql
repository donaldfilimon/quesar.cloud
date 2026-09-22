create table if not exists field_notes (
  id         serial primary key,
  user_id    text not null,
  node_id    text not null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists field_notes_user_id_idx on field_notes (user_id);
