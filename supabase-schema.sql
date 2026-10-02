-- Mid-Ama Promo hosted persistence
-- Run this once in the Supabase SQL Editor before deploying.

create table if not exists public.midama_state (
  id text primary key check (id = 'main'),
  version bigint not null default 1,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.midama_state enable row level security;

-- No browser/client role is allowed to read or write the state directly.
-- The application server uses the Supabase service-role key.
drop policy if exists midama_state_no_anon on public.midama_state;
create policy midama_state_no_anon on public.midama_state
  for all to anon, authenticated using (false) with check (false);

create or replace function public.midama_update_state(expected_version bigint, next_state jsonb)
returns table(id text, version bigint, state jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  current_version bigint;
begin
  select s.version into current_version
  from public.midama_state s
  where s.id = 'main'
  for update;

  if current_version is null then
    return;
  end if;

  if current_version <> expected_version then
    return;
  end if;

  update public.midama_state s
  set version = current_version + 1,
      state = next_state,
      updated_at = now()
  where s.id = 'main';

  return query
  select s.id, s.version, s.state, s.updated_at
  from public.midama_state s
  where s.id = 'main';
end;
$$;

revoke all on function public.midama_update_state(bigint, jsonb) from public;
revoke all on function public.midama_update_state(bigint, jsonb) from anon, authenticated;

-- Storage bucket for secure uploaded assets (MP3 audio masters, cover artwork, distribution documents)
insert into storage.buckets (id, name, public)
values ('midama-assets', 'midama-assets', false)
on conflict (id) do nothing;


