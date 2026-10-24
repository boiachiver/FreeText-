-- FreeText social features compatibility and direct-message RLS fixes
-- Safe to run in the Supabase SQL Editor more than once.
-- Create messaging and story tables first in case schema.sql has not been applied yet.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  title text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  message_type text not null default 'text' check (message_type in ('text','image','video','audio','file')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image','video')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists cover_url text;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.stories enable row level security;

-- SECURITY DEFINER avoids recursive RLS while checking membership.
create or replace function public.is_conversation_member(target_conversation uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = target_conversation
      and cm.user_id = target_user
  );
$$;

revoke all on function public.is_conversation_member(uuid, uuid) from public;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

drop policy if exists conversation_members_read on public.conversation_members;
drop policy if exists conversation_members_write on public.conversation_members;
drop policy if exists conversation_members_insert on public.conversation_members;
drop policy if exists conversation_members_delete on public.conversation_members;

create policy conversation_members_read
on public.conversation_members for select
using (public.is_conversation_member(conversation_id, auth.uid()) or public.is_admin());

-- Only the creator of a conversation may add members during conversation setup.
create policy conversation_members_insert
on public.conversation_members for insert
with check (
  public.is_admin()
  or exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.created_by = auth.uid()
  )
);

create policy conversation_members_delete
on public.conversation_members for delete
using (user_id = auth.uid() or public.is_admin());

drop policy if exists conversations_read on public.conversations;
create policy conversations_read
on public.conversations for select
using (public.is_conversation_member(id, auth.uid()) or public.is_admin());

drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert
on public.conversations for insert
with check (created_by = auth.uid());

drop policy if exists messages_read on public.messages;
create policy messages_read
on public.messages for select
using (public.is_conversation_member(conversation_id, auth.uid()) or public.is_admin());

drop policy if exists messages_insert on public.messages;
create policy messages_insert
on public.messages for insert
with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id, auth.uid()));

drop policy if exists messages_update on public.messages;
create policy messages_update
on public.messages for update
using (sender_id = auth.uid() or public.is_admin())
with check (sender_id = auth.uid() or public.is_admin());

-- Ensure active stories are discoverable while authors can still manage their own stories.
drop policy if exists stories_read on public.stories;
create policy stories_read on public.stories for select
using (expires_at > now() or author_id = auth.uid() or public.is_admin());

drop policy if exists stories_write on public.stories;
create policy stories_write on public.stories for all
using (author_id = auth.uid() or public.is_admin())
with check (author_id = auth.uid() or public.is_admin());

create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);
create index if not exists stories_expires_idx on public.stories(expires_at);
