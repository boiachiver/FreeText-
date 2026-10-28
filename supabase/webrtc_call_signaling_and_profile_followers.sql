create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  signal_type text not null check (signal_type in ('offer','answer','ice','hangup','ringing','accepted','rejected')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists call_signals_recipient_created_idx on public.call_signals(recipient_id, created_at desc);
create index if not exists call_signals_call_created_idx on public.call_signals(call_id, created_at asc);
alter table public.call_signals enable row level security;
drop policy if exists call_signals_select on public.call_signals;
drop policy if exists call_signals_insert on public.call_signals;
create policy call_signals_select on public.call_signals for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy call_signals_insert on public.call_signals for insert to authenticated with check (auth.uid() = sender_id and (auth.uid() = recipient_id or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = recipient_id)));
drop policy if exists call_signals_delete on public.call_signals;
create policy call_signals_delete on public.call_signals for delete to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);

create or replace function public.get_profile_followers(target_user uuid)
returns table (id uuid, username text, full_name text, avatar_url text, is_verified boolean)
language sql stable security invoker set search_path = public
as $$
  select p.id, p.username, p.full_name, p.avatar_url, p.is_verified
  from public.follows f
  join public.profiles p on p.id = f.follower_id
  where f.following_id = target_user and coalesce(p.is_banned,false) = false
  order by f.created_at desc;
$$;
revoke execute on function public.get_profile_followers(uuid) from public;
grant execute on function public.get_profile_followers(uuid) to authenticated;
