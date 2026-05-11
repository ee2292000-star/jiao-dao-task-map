create table if not exists public.personal_todos (
  id text primary key,
  owner_id text not null,
  title text not null,
  note text,
  content text,
  due_date text,
  status text not null default 'todo',
  color text not null default 'yellow',
  x double precision not null default 80,
  y double precision not null default 80,
  rotation double precision not null default 0,
  completed_at text,
  is_private boolean not null default true,
  created_at text not null,
  updated_at text not null
);

alter table public.personal_todos
add column if not exists content text;

alter table public.personal_todos
add column if not exists color text not null default 'yellow';

alter table public.personal_todos
add column if not exists x double precision not null default 80;

alter table public.personal_todos
add column if not exists y double precision not null default 80;

alter table public.personal_todos
add column if not exists rotation double precision not null default 0;

alter table public.personal_todos
add column if not exists completed_at text;

alter table public.personal_todos
add column if not exists is_private boolean not null default true;

create index if not exists personal_todos_owner_id_idx
on public.personal_todos (owner_id);

alter table public.personal_todos enable row level security;

drop policy if exists "Allow public read personal todos" on public.personal_todos;
create policy "Allow public read personal todos"
on public.personal_todos
for select
using (true);

drop policy if exists "Allow public write personal todos" on public.personal_todos;
create policy "Allow public write personal todos"
on public.personal_todos
for all
using (true)
with check (true);
