create table if not exists public.inspiration_topics (
  id text primary key,
  owner_id text not null,
  title text not null,
  description text,
  category text not null default 'other',
  status text not null default 'open',
  created_at text not null,
  updated_at text not null,
  archived_at text
);

create table if not exists public.inspiration_notes (
  id text primary key,
  topic_id text not null references public.inspiration_topics(id) on delete cascade,
  owner_id text not null,
  title text,
  content text not null,
  color text not null default 'yellow',
  x double precision not null default 90,
  y double precision not null default 90,
  rotation double precision not null default 0,
  status text not null default 'active',
  created_at text not null,
  updated_at text not null
);

create index if not exists inspiration_topics_owner_id_idx
on public.inspiration_topics (owner_id);

create index if not exists inspiration_notes_owner_id_idx
on public.inspiration_notes (owner_id);

create index if not exists inspiration_notes_topic_id_idx
on public.inspiration_notes (topic_id);

alter table public.inspiration_topics enable row level security;
alter table public.inspiration_notes enable row level security;

drop policy if exists "Allow public read inspiration topics" on public.inspiration_topics;
create policy "Allow public read inspiration topics"
on public.inspiration_topics
for select
using (true);

drop policy if exists "Allow public write inspiration topics" on public.inspiration_topics;
create policy "Allow public write inspiration topics"
on public.inspiration_topics
for all
using (true)
with check (true);

drop policy if exists "Allow public read inspiration notes" on public.inspiration_notes;
create policy "Allow public read inspiration notes"
on public.inspiration_notes
for select
using (true);

drop policy if exists "Allow public write inspiration notes" on public.inspiration_notes;
create policy "Allow public write inspiration notes"
on public.inspiration_notes
for all
using (true)
with check (true);
