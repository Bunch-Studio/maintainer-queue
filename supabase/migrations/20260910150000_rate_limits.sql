-- Serverless instances share nothing, so the MCP rate limit counts in Postgres: one row per key and minute.
create table public.rate_limits (
  key text not null,
  bucket timestamptz not null,
  count integer not null default 0,
  primary key (key, bucket)
);
alter table public.rate_limits enable row level security;

-- Increments the caller's counter for the current window and reports whether it is now over the limit.
create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  b timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c integer;
begin
  insert into public.rate_limits (key, bucket, count) values (p_key, b, 1)
  on conflict (key, bucket) do update set count = public.rate_limits.count + 1
  returning count into c;
  -- Drop stale windows now and then so the table stays small.
  if random() < 0.01 then
    delete from public.rate_limits where bucket < now() - make_interval(secs => p_window_seconds * 2);
  end if;
  return c > p_limit;
end;
$$;
