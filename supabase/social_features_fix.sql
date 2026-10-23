-- FreeText social features compatibility and direct-message RLS fixes
-- Safe to run in the Supabase SQL Editor more than once.
alter table public.profiles add column if not exists cover_url text;

-- SECURITY DEFINER avoids recursive RLS while checking membership in a conversation.
create or replace function public.is_conversation_member(target_conversation uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
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

-- Only the creator of a conversation may add its members during setup.
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

-- Ensure active stories are discoverable while authors can still manage their own stories.
drop policy if exists stories_read on public.stories;
create policy stories_read on public.stories for select
using (expires_at > now() or author_id = auth.uid() or public.is_admin());
