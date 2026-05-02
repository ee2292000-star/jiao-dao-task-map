create table if not exists public.teacher_accounts (
  id uuid primary key default gen_random_uuid(),
  teacher_id text,
  name text not null,
  email text not null unique,
  password_hash text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teacher_accounts enable row level security;

grant all on table public.teacher_accounts to service_role;
