-- Main app data schema for 教導處任務地圖.
-- Safe to run more than once. This file does not insert demo data.
-- Do not add public policies for teacher_accounts here; that table is server-only.

create table if not exists public.teachers (
  id text primary key,
  name text not null,
  role text not null default '教師',
  avatar text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teachers add column if not exists role text not null default '教師';
alter table public.teachers add column if not exists avatar text not null default '';
alter table public.teachers add column if not exists created_at timestamptz not null default now();
alter table public.teachers add column if not exists updated_at timestamptz not null default now();

create table if not exists public.events (
  id text primary key,
  name text not null,
  month text not null default '',
  start_date date not null default current_date,
  end_date date not null default current_date,
  template_id text,
  review_notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events add column if not exists month text not null default '';
alter table public.events add column if not exists start_date date not null default current_date;
alter table public.events add column if not exists end_date date not null default current_date;
alter table public.events add column if not exists template_id text;
alter table public.events add column if not exists review_notes jsonb not null default '[]'::jsonb;
alter table public.events add column if not exists created_at timestamptz not null default now();
alter table public.events add column if not exists updated_at timestamptz not null default now();

create table if not exists public.tasks (
  id text primary key,
  title text not null,
  description text not null default '',
  assignees jsonb not null default '[]'::jsonb,
  owner_ids jsonb not null default '[]'::jsonb,
  event_id text,
  status text not null default 'todo',
  priority text not null default 'normal',
  is_critical boolean not null default false,
  is_blocked boolean not null default false,
  is_key_task boolean not null default false,
  due_date date not null default current_date,
  start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  comments jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb
);

alter table public.tasks add column if not exists description text not null default '';
alter table public.tasks add column if not exists assignees jsonb not null default '[]'::jsonb;
alter table public.tasks add column if not exists owner_ids jsonb not null default '[]'::jsonb;
alter table public.tasks add column if not exists event_id text;
alter table public.tasks add column if not exists status text not null default 'todo';
alter table public.tasks add column if not exists priority text not null default 'normal';
alter table public.tasks add column if not exists is_critical boolean not null default false;
alter table public.tasks add column if not exists is_blocked boolean not null default false;
alter table public.tasks add column if not exists is_key_task boolean not null default false;
alter table public.tasks add column if not exists due_date date not null default current_date;
alter table public.tasks add column if not exists start_date date;
alter table public.tasks add column if not exists created_at timestamptz not null default now();
alter table public.tasks add column if not exists updated_at timestamptz not null default now();
alter table public.tasks add column if not exists comments jsonb not null default '[]'::jsonb;
alter table public.tasks add column if not exists attachments jsonb not null default '[]'::jsonb;

create table if not exists public.sticky_notes (
  id text primary key,
  event_id text,
  author_id text,
  color text not null default 'yellow',
  body text not null,
  assignee_id text,
  due_date date,
  done boolean not null default false,
  converted_task_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sticky_notes add column if not exists event_id text;
alter table public.sticky_notes add column if not exists author_id text;
alter table public.sticky_notes add column if not exists color text not null default 'yellow';
alter table public.sticky_notes add column if not exists body text not null default '';
alter table public.sticky_notes add column if not exists assignee_id text;
alter table public.sticky_notes add column if not exists due_date date;
alter table public.sticky_notes add column if not exists done boolean not null default false;
alter table public.sticky_notes add column if not exists converted_task_id text;
alter table public.sticky_notes add column if not exists created_at timestamptz not null default now();
alter table public.sticky_notes add column if not exists updated_at timestamptz not null default now();

create table if not exists public.comments (
  id text primary key,
  task_id text,
  author_id text,
  body text not null default '',
  created_at timestamptz not null default now()
);

alter table public.teachers enable row level security;
alter table public.events enable row level security;
alter table public.tasks enable row level security;
alter table public.sticky_notes enable row level security;
alter table public.comments enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.teachers to anon, authenticated;
grant select, insert, update, delete on public.events to anon, authenticated;
grant select, insert, update, delete on public.tasks to anon, authenticated;
grant select, insert, update, delete on public.sticky_notes to anon, authenticated;
grant select, insert, update, delete on public.comments to anon, authenticated;

drop policy if exists "allow public read teachers" on public.teachers;
drop policy if exists "allow public write teachers" on public.teachers;
create policy "allow public read teachers" on public.teachers for select using (true);
create policy "allow public write teachers" on public.teachers for all using (true) with check (true);

drop policy if exists "allow public read events" on public.events;
drop policy if exists "allow public write events" on public.events;
create policy "allow public read events" on public.events for select using (true);
create policy "allow public write events" on public.events for all using (true) with check (true);

drop policy if exists "allow public read tasks" on public.tasks;
drop policy if exists "allow public write tasks" on public.tasks;
create policy "allow public read tasks" on public.tasks for select using (true);
create policy "allow public write tasks" on public.tasks for all using (true) with check (true);

drop policy if exists "allow public read sticky_notes" on public.sticky_notes;
drop policy if exists "allow public write sticky_notes" on public.sticky_notes;
create policy "allow public read sticky_notes" on public.sticky_notes for select using (true);
create policy "allow public write sticky_notes" on public.sticky_notes for all using (true) with check (true);

drop policy if exists "allow public read comments" on public.comments;
drop policy if exists "allow public write comments" on public.comments;
create policy "allow public read comments" on public.comments for select using (true);
create policy "allow public write comments" on public.comments for all using (true) with check (true);
