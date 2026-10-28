-- FreeText production WebRTC signaling
create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  call_type text not null check (call_type in ('voice','video')),
  status text not null default 'ringing' check (status in ('ringing','accepted','declined','ended','missed')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  constraint call_sessions_different_users check (caller_id <> callee_id)
);

create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.call_sessions(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  signal_type text not null check (signal_type in ('offer','answer','ice','hangup','reject')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists call_sessions_caller_idx on public.call_sessions(caller_id, created_at desc);
create index if not exists call_sessions_callee_idx on public.call_sessions(callee_id, created_at desc);
create index if not exists call_signals_call_idx on public.call_signals(call_id, created_at asc);

alter table public.call_sessions enable row level security;
alter table public.call_signals enable row level security;

drop policy if exists call_sessions_select_participant on public.call_sessions;
drop policy if exists call_sessions_insert_caller on public.call_sessions;
drop policy if exists call_sessions_update_participant on public.call_sessions;
create policy call_sessions_select_participant on public.call_sessions for select to authenticated using ((select auth.uid()) = caller_id or (select auth.uid()) = callee_id);
create policy call_sessions_insert_caller on public.call_sessions for insert to authenticated with check ((select auth.uid()) = caller_id);
create policy call_sessions_update_participant on public.call_sessions for update to authenticated using ((select auth.uid()) = caller_id or (select auth.uid()) = callee_id) with check ((select auth.uid()) = caller_id or (select auth.uid()) = callee_id);

drop policy if exists call_signals_select_participant on public.call_signals;
drop policy if exists call_signals_insert_participant on public.call_signals;
create policy call_signals_select_participant on public.call_signals for select to authenticated using (exists (select 1 from public.call_sessions c where c.id = call_id and ((select auth.uid()) = c.caller_id or (select auth.uid()) = c.callee_id)));
create policy call_signals_insert_participant on public.call_signals for insert to authenticated with check ((select auth.uid()) = sender_id and exists (select 1 from public.call_sessions c where c.id = call_id and ((select auth.uid()) = c.caller_id or (select auth.uid()) = c.callee_id)));

revoke all on public.call_sessions from anon;
revoke all on public.call_signals from anon;
grant select, insert, update on public.call_sessions to authenticated;
grant select, insert on public.call_signals to authenticated;

alter table public.call_sessions replica identity full;
alter table public.call_signals replica identity full;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'call_sessions') then
    alter publication supabase_realtime add table public.call_sessions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'call_signals') then
    alter publication supabase_realtime add table public.call_signals;
  end if;
end $$;
