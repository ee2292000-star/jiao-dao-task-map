create table if not exists public.idea_wall_topics (
  id text primary key,
  title text not null,
  archived boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.idea_wall_notes (
  id text primary key,
  title text,
  body text not null,
  author_id text not null,
  author_name text not null,
  color text not null default 'yellow',
  x double precision not null default 80,
  y double precision not null default 80,
  rotation double precision not null default 0,
  visibility text not null default 'all',
  target_teacher_ids jsonb not null default '[]'::jsonb,
  support_user_ids jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  pinned boolean not null default false,
  archived boolean not null default false,
  created_at text not null,
  updated_at text not null
);

alter table public.idea_wall_notes
  add column if not exists x double precision not null default 80,
  add column if not exists y double precision not null default 80,
  add column if not exists rotation double precision not null default 0,
  add column if not exists visibility text not null default 'all',
  add column if not exists target_teacher_ids jsonb not null default '[]'::jsonb;

alter table public.idea_wall_topics enable row level security;
alter table public.idea_wall_notes enable row level security;

drop policy if exists "Allow public read idea wall topics" on public.idea_wall_topics;
create policy "Allow public read idea wall topics"
on public.idea_wall_topics
for select
using (true);

drop policy if exists "Allow public write idea wall topics" on public.idea_wall_topics;
create policy "Allow public write idea wall topics"
on public.idea_wall_topics
for all
using (true)
with check (true);

drop policy if exists "Allow public read idea wall notes" on public.idea_wall_notes;
create policy "Allow public read idea wall notes"
on public.idea_wall_notes
for select
using (true);

drop policy if exists "Allow public write idea wall notes" on public.idea_wall_notes;
create policy "Allow public write idea wall notes"
on public.idea_wall_notes
for all
using (true)
with check (true);

insert into public.idea_wall_topics (id, title, archived)
values ('default', '畢業典禮主題募集', false)
on conflict (id) do nothing;
