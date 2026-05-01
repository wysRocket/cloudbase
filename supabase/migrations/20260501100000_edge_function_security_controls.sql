begin;

create table if not exists public.function_rate_limits (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  request_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists function_rate_limits_user_action_created_idx
  on public.function_rate_limits (user_id, action, created_at desc);

create unique index if not exists function_rate_limits_request_id_key
  on public.function_rate_limits (request_id);

create table if not exists public.function_audit_trail (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  actor text not null,
  request_id text not null,
  ip_hash text,
  user_agent_hash text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists function_audit_trail_user_created_idx
  on public.function_audit_trail (user_id, created_at desc);

create index if not exists function_audit_trail_action_created_idx
  on public.function_audit_trail (action, created_at desc);

commit;
