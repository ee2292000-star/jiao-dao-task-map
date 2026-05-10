create table if not exists public.personal_todos (
  id text primary key,
  owner_id text not null,
  title text not null,
  note text,
  due_date text,
  status text not null default 'todo',
  created_at text not null,
  updated_at text not null
);

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
