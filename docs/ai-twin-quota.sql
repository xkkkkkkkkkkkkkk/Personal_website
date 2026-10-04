-- Run once in the existing Supabase project's SQL Editor.
-- No conversations, question text, or raw IP addresses are stored.
create table if not exists public.ai_twin_quota (
  bucket text primary key,
  used integer not null,
  expires_at timestamptz not null
);
alter table public.ai_twin_quota enable row level security;
revoke all on public.ai_twin_quota from anon, authenticated;

create or replace function public.ai_twin_take_quota(client_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_time_utc timestamptz := now();
  daily_bucket text := 'day:' || to_char(now() at time zone 'UTC', 'YYYY-MM-DD');
  visitor_bucket text := 'ip:' || client_hash || ':' || floor(extract(epoch from now()) / 600)::text;
  counter integer;
begin
  if client_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  delete from public.ai_twin_quota where expires_at < current_time_utc - interval '1 day';
  insert into public.ai_twin_quota as q values (daily_bucket, 1, current_time_utc + interval '1 day')
    on conflict (bucket) do update set used = q.used + 1 where q.used < 200
    returning used into counter;
  if counter is null then return false; end if;
  counter := null;
  insert into public.ai_twin_quota as q values (visitor_bucket, 1, current_time_utc + interval '10 minutes')
    on conflict (bucket) do update set used = q.used + 1 where q.used < 20
    returning used into counter;
  return counter is not null;
end;
$$;
revoke all on function public.ai_twin_take_quota(text) from public, anon, authenticated;
grant execute on function public.ai_twin_take_quota(text) to service_role;
