create extension if not exists pgcrypto;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('enhance','split','transcribe')),
  status text not null check (status in ('queued','running','failed','completed')) default 'queued',
  input_urls text[] not null,
  params jsonb not null default '{}',
  result_url text,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.job_events (
  id bigserial primary key,
  job_id uuid references public.jobs(id) on delete cascade,
  ts timestamptz default now(),
  level text default 'info',
  message text,
  data jsonb
);