-- FreeText full social + admin production migration
-- Run this in Supabase SQL Editor after schema.sql and super_admin.sql.
-- This migration is intentionally idempotent.

create table if not exists public.post_saves (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.post_views (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.user_blocks (
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.user_mutes (
  muter_id uuid references public.profiles(id) on delete cascade,
  muted_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  call_type text not null check (call_type in ('voice','video')),
  status text not null default 'ringing' check (status in ('ringing','accepted','declined','missed','ended','cancelled')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  messages boolean not null default true,
  calls boolean not null default true,
  follows boolean not null default true,
  likes boolean not null default true,
  comments boolean not null default true,
  posts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.post_saves enable row level security;
alter table public.post_shares enable row level security;
alter table public.post_views enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_mutes enable row level security;
alter table public.calls enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists post_saves_read on public.post_saves;
create policy post_saves_read on public.post_saves for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists post_saves_write on public.post_saves;
create policy post_saves_write on public.post_saves for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists post_shares_read on public.post_shares;
create policy post_shares_read on public.post_shares for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists post_shares_insert on public.post_shares;
create policy post_shares_insert on public.post_shares for insert with check (user_id = auth.uid());

drop policy if exists post_views_read on public.post_views;
create policy post_views_read on public.post_views for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists post_views_write on public.post_views;
create policy post_views_write on public.post_views for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_blocks_self on public.user_blocks;
create policy user_blocks_self on public.user_blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
drop policy if exists user_blocks_admin on public.user_blocks;
create policy user_blocks_admin on public.user_blocks for select using (public.is_admin());

drop policy if exists user_mutes_self on public.user_mutes;
create policy user_mutes_self on public.user_mutes for all using (muter_id = auth.uid()) with check (muter_id = auth.uid());

drop policy if exists calls_participants on public.calls;
create policy calls_participants on public.calls for select using (caller_id = auth.uid() or callee_id = auth.uid() or public.is_admin());
drop policy if exists calls_create on public.calls;
create policy calls_create on public.calls for insert with check (caller_id = auth.uid());
drop policy if exists calls_update on public.calls;
create policy calls_update on public.calls for update using (caller_id = auth.uid() or callee_id = auth.uid() or public.is_admin()) with check (caller_id = auth.uid() or callee_id = auth.uid() or public.is_admin());

drop policy if exists notification_preferences_self on public.notification_preferences;
create policy notification_preferences_self on public.notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.notify_user(
  target_user uuid,
  actor uuid,
  notification_type text,
  entity uuid,
  notification_message text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if target_user is null or actor is null or target_user = actor then return; end if;
  insert into public.notifications(user_id, actor_id, type, entity_id, message)
  values (target_user, actor, notification_type, entity, notification_message);
end;
$$;
revoke all on function public.notify_user(uuid, uuid, text, uuid, text) from public;
grant execute on function public.notify_user(uuid, uuid, text, uuid, text) to authenticated;

create or replace function public.record_post_share(target_post uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.posts where id = target_post) then raise exception 'post not found'; end if;
  insert into public.post_shares(post_id, user_id) values (target_post, auth.uid());
end;
$$;
revoke all on function public.record_post_share(uuid) from public;
grant execute on function public.record_post_share(uuid) to authenticated;

create or replace function public.admin_set_report_status(target_report uuid, new_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if new_status not in ('open','reviewed','resolved','dismissed') then raise exception 'invalid report status'; end if;
  update public.reports
    set status = new_status,
        resolved_at = case when new_status in ('resolved','dismissed') then now() else null end
  where id = target_report;
  if not found then raise exception 'report not found'; end if;
  insert into public.admin_audit_logs(admin_id, action, details)
  values (auth.uid(), 'set_report_status', jsonb_build_object('report_id', target_report, 'status', new_status));
end;
$$;
revoke all on function public.admin_set_report_status(uuid, text) from public;
grant execute on function public.admin_set_report_status(uuid, text) to authenticated;

create index if not exists post_saves_user_idx on public.post_saves(user_id, created_at desc);
create index if not exists post_shares_post_idx on public.post_shares(post_id, created_at desc);
create index if not exists post_views_post_idx on public.post_views(post_id, viewed_at desc);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);
create index if not exists calls_participants_idx on public.calls(caller_id, callee_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id, read_at, created_at desc);

-- Keep the authenticated user's preference row available without exposing other users' settings.
insert into public.notification_preferences(user_id)
select id from public.profiles
where not exists (
  select 1 from public.notification_preferences np where np.user_id = public.profiles.id
)
on conflict (user_id) do nothing;

notify pgrst, 'reload schema';
