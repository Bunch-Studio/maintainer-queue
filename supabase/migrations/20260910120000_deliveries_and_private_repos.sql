-- Every GitHub delivery is stored before it is processed, so a duplicate is a no-op and a failure can be retried.
create table public.webhook_deliveries (
  id text primary key,
  event text not null,
  action text,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index webhook_deliveries_retry_idx on public.webhook_deliveries (status, created_at) where status = 'failed';
alter table public.webhook_deliveries enable row level security;

-- Private repositories stay off the public board, task pages and MCP listing.
drop policy "active repos are public" on public.repos;
create policy "active public repos are public" on public.repos for select using (active and not is_private);

drop policy "tasks are public" on public.tasks;
create policy "tasks on public repos are public" on public.tasks for select
  using (exists (select 1 from public.repos r where r.id = tasks.repo_id and not r.is_private));

drop policy "claims are public" on public.claims;
create policy "claims on public repos are public" on public.claims for select
  using (exists (select 1 from public.tasks t join public.repos r on r.id = t.repo_id where t.id = claims.task_id and not r.is_private));

drop policy "submissions are public" on public.submissions;
create policy "submissions on public repos are public" on public.submissions for select
  using (exists (select 1 from public.tasks t join public.repos r on r.id = t.repo_id where t.id = submissions.task_id and not r.is_private));
