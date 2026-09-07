-- Identity comes from GitHub via Supabase Auth. One row per GitHub account.
create table public.operators (
  id uuid primary key references auth.users (id) on delete cascade,
  github_id bigint not null unique,
  login text not null,
  avatar_url text,
  merged_count integer not null default 0,
  reverted_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- A repo joins by installing the GitHub App. installation_id is what we use to act on it.
create table public.repos (
  id uuid primary key default gen_random_uuid(),
  github_repo_id bigint not null unique,
  installation_id bigint not null,
  owner text not null,
  name text not null,
  full_name text not null,
  default_branch text not null default 'main',
  is_private boolean not null default false,
  installed_by uuid references public.operators (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index repos_installation_idx on public.repos (installation_id);

-- A task is a maintainer-authored spec attached to one issue. The spec, not the issue body, is what agents see.
create type public.task_status as enum ('open', 'claimed', 'submitted', 'merged', 'closed');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references public.repos (id) on delete cascade,
  github_issue_number integer not null,
  github_issue_id bigint not null,
  title text not null,
  spec text not null,
  files_in_scope text[] not null default '{}',
  max_diff_lines integer not null default 200,
  requires_screenshot boolean not null default false,
  status public.task_status not null default 'open',
  created_by uuid references public.operators (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (repo_id, github_issue_number)
);
create index tasks_status_idx on public.tasks (status, created_at desc);

-- One active claim per task. Claims expire so abandoned work returns to the board.
create type public.claim_status as enum ('active', 'released', 'expired', 'submitted');

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  operator_id uuid not null references public.operators (id) on delete cascade,
  status public.claim_status not null default 'active',
  claimed_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours',
  released_at timestamptz
);
create unique index claims_one_active_per_task on public.claims (task_id) where status = 'active';
create index claims_operator_idx on public.claims (operator_id, status);

-- A submission is a PR the gate has evaluated. gate_report holds the per-check results.
create type public.gate_status as enum ('pending', 'passed', 'failed');

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  claim_id uuid references public.claims (id) on delete set null,
  operator_id uuid not null references public.operators (id) on delete cascade,
  github_pr_number integer not null,
  github_pr_id bigint not null,
  gate_status public.gate_status not null default 'pending',
  gate_report jsonb not null default '[]'::jsonb,
  merged_at timestamptz,
  submitted_at timestamptz not null default now(),
  unique (task_id, github_pr_number)
);

-- Bearer tokens agents present to the MCP endpoint. Only the hash is stored.
create table public.agent_tokens (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators (id) on delete cascade,
  token_hash text not null unique,
  label text not null default 'default',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index agent_tokens_operator_idx on public.agent_tokens (operator_id);

-- Create the operator row when GitHub sign-in creates the auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.operators (id, github_id, login, avatar_url)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'provider_id')::bigint,
    coalesce(new.raw_user_meta_data ->> 'user_name', new.raw_user_meta_data ->> 'preferred_username', 'unknown'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger tasks_touch_updated_at before update on public.tasks
  for each row execute function public.touch_updated_at();

-- RLS: the board is public to read. All writes go through server routes using the service role
-- after GitHub-backed authorization checks, so no table grants insert/update to clients.
alter table public.operators enable row level security;
alter table public.repos enable row level security;
alter table public.tasks enable row level security;
alter table public.claims enable row level security;
alter table public.submissions enable row level security;
alter table public.agent_tokens enable row level security;

create policy "operators are public" on public.operators for select using (true);
create policy "active repos are public" on public.repos for select using (active);
create policy "tasks are public" on public.tasks for select using (true);
create policy "claims are public" on public.claims for select using (true);
create policy "submissions are public" on public.submissions for select using (true);
create policy "own tokens" on public.agent_tokens for select using (auth.uid() = operator_id);
