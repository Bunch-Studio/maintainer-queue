-- A merged revert of a task PR is recorded on the submission and counted against the operator.
alter table public.submissions add column reverted_at timestamptz;
