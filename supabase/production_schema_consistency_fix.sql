-- FreeText production schema consistency fix.
-- Canonical idempotent migration matching the live Supabase database.
-- Safe to run after schema.sql and the feature migrations.

create extension if not exists pgcrypto;

-- Message/E2EE/media compatibility.
alter table public.profiles add column if not exists cover_url text;
alter table public.profiles add column if not exists public_key text;
alter table public.messages add column if not exists ciphertext text;
alter table public.messages add column if not exists iv text;
alter table public.messages add column if not exists encrypted_keys jsonb;
alter table public.messages add column if not exists attachment_path text;
alter table public.messages add column if not exists attachment_name text;
alter table public.messages add column if not exists attachment_mime text;
alter table public.messages add column if not exists attachment_size bigint;
alter table public.messages alter column body drop not null;
drop constraint if exists messages_message_type_check on public.messages;
alter table public.messages add constraint messages_message_type_check check (message_type in ('text','image','video','audio','file'));

-- Social/admin tables required by the production app.
create table if not exists public.post_saves (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
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
  primary key (post_id,user_id)
);
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id,blocked_id),
  check (blocker_id <> blocked_id)
);
create table if not exists public.user_mutes (
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id,muted_id),
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

-- RLS is mandatory on every exposed app table.
alter table public.post_saves enable row level security;
alter table public.post_shares enable row level security;
alter table public.post_views enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_mutes enable row level security;
alter table public.calls enable row level security;
alter table public.notification_preferences enable row level security;

-- Idempotent policies for the tables added above.
drop policy if exists post_saves_read on public.post_saves;
create policy post_saves_read on public.post_saves for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists post_saves_write on public.post_saves;
create policy post_saves_write on public.post_saves for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists post_shares_read on public.post_shares;
create policy post_shares_read on public.post_shares for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists post_shares_insert on public.post_shares;
create policy post_shares_insert on public.post_shares for insert to authenticated with check (user_id=auth.uid());
drop policy if exists post_views_read on public.post_views;
create policy post_views_read on public.post_views for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists post_views_write on public.post_views;
create policy post_views_write on public.post_views for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists user_blocks_self on public.user_blocks;
create policy user_blocks_self on public.user_blocks for all to authenticated using (blocker_id=auth.uid()) with check (blocker_id=auth.uid() and blocker_id<>blocked_id);
drop policy if exists user_blocks_admin on public.user_blocks;
create policy user_blocks_admin on public.user_blocks for select to authenticated using (public.is_admin());
drop policy if exists user_mutes_self on public.user_mutes;
create policy user_mutes_self on public.user_mutes for all to authenticated using (muter_id=auth.uid()) with check (muter_id=auth.uid() and muter_id<>muted_id);
drop policy if exists calls_participants on public.calls;
create policy calls_participants on public.calls for select to authenticated using (caller_id=auth.uid() or callee_id=auth.uid() or public.is_admin());
drop policy if exists calls_create on public.calls;
create policy calls_create on public.calls for insert to authenticated with check (caller_id=auth.uid());
drop policy if exists calls_update on public.calls;
create policy calls_update on public.calls for update to authenticated using (caller_id=auth.uid() or callee_id=auth.uid() or public.is_admin()) with check (caller_id=auth.uid() or callee_id=auth.uid() or public.is_admin());
drop policy if exists notification_preferences_self on public.notification_preferences;
create policy notification_preferences_self on public.notification_preferences for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Case-insensitive usernames prevent Boi and boi from becoming two identities.
create unique index if not exists profiles_username_lower_idx on public.profiles(lower(username)) where username is not null;

-- Production indexes.
create index if not exists messages_attachment_idx on public.messages(conversation_id,created_at) where attachment_path is not null;
create index if not exists messages_encrypted_idx on public.messages(conversation_id,created_at) where ciphertext is not null;
create index if not exists notifications_user_idx on public.notifications(user_id,created_at desc);
create index if not exists post_saves_user_idx on public.post_saves(user_id,created_at desc);
create index if not exists post_shares_post_idx on public.post_shares(post_id,created_at desc);
create index if not exists post_views_post_idx on public.post_views(post_id,viewed_at desc);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);
create index if not exists calls_participants_idx on public.calls(caller_id,callee_id,created_at desc);

notify pgrst,'reload schema';
