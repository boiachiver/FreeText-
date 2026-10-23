-- FreeText Super Admin upgrade
-- Run this once in Supabase SQL Editor for project iysggvegsephlemeuzvh.
-- All sensitive role changes are checked server-side; RLS remains enabled.

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_post_id uuid references public.posts(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists is_super_admin boolean not null default false;
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.reports add column if not exists resolved_at timestamptz;

alter table public.admin_audit_logs enable row level security;
grant select, insert on public.admin_audit_logs to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, update on public.reports to authenticated;

drop policy if exists audit_admin on public.admin_audit_logs;
create policy audit_admin on public.admin_audit_logs
  for select to authenticated using (public.is_admin());
drop policy if exists audit_insert on public.admin_audit_logs;
create policy audit_insert on public.admin_audit_logs
  for insert to authenticated with check (public.is_admin() and admin_id = auth.uid());

-- Only an authenticated super administrator can promote/demote admin roles.
create or replace function public.admin_set_role(target uuid, make_admin boolean, make_super_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_is_super boolean;
begin
  if not public.is_super_admin() then
    raise exception 'super administrator access required';
  end if;
  if target = auth.uid() then
    raise exception 'you cannot change your own administrator role';
  end if;
  if make_super_admin and not make_admin then
    raise exception 'a super administrator must also be an administrator';
  end if;

  select is_super_admin into target_is_super
  from public.profiles where id = target for update;
  if not found then raise exception 'user not found'; end if;

  if target_is_super and not make_super_admin then
    if (select count(*) from public.profiles where is_super_admin = true and is_banned = false) <= 1 then
      raise exception 'cannot remove the last active super administrator';
    end if;
  end if;

  update public.profiles
  set is_admin = make_admin,
      is_super_admin = make_super_admin,
      updated_at = now()
  where id = target;

  insert into public.admin_audit_logs(admin_id, action, target_user_id, details)
  values(auth.uid(), 'set_admin_role', target,
    jsonb_build_object('is_admin', make_admin, 'is_super_admin', make_super_admin));
end;
$$;

create or replace function public.admin_set_banned(target uuid, banned boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare target_is_super boolean;
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  select is_super_admin into target_is_super from public.profiles where id = target for update;
  if not found then raise exception 'user not found'; end if;
  if target_is_super and not public.is_super_admin() then
    raise exception 'only a super administrator can manage a super administrator';
  end if;
  if target = auth.uid() and banned then raise exception 'you cannot ban your own account'; end if;
  if target_is_super and banned and
     (select count(*) from public.profiles where is_super_admin = true and is_banned = false) <= 1 then
    raise exception 'cannot ban the last active super administrator';
  end if;

  update public.profiles set is_banned = banned, updated_at = now() where id = target;
  insert into public.admin_audit_logs(admin_id, action, target_user_id, details)
  values(auth.uid(), case when banned then 'ban_user' else 'unban_user' end, target,
         jsonb_build_object('banned', banned));
end;
$$;

create or replace function public.admin_set_verified(target uuid, verified boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  update public.profiles set is_verified = verified, updated_at = now() where id = target;
  if not found then raise exception 'user not found'; end if;
  insert into public.admin_audit_logs(admin_id, action, target_user_id, details)
  values(auth.uid(), case when verified then 'verify_user' else 'unverify_user' end,
         target, jsonb_build_object('verified', verified));
end;
$$;

create or replace function public.admin_delete_post(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare post_author uuid; author_is_super boolean;
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  select author_id into post_author from public.posts where id = target for update;
  if not found then raise exception 'post not found'; end if;
  select is_super_admin into author_is_super from public.profiles where id = post_author;
  if coalesce(author_is_super, false) and not public.is_super_admin() then
    raise exception 'only a super administrator can delete a super administrator post';
  end if;
  delete from public.posts where id = target;
  insert into public.admin_audit_logs(admin_id, action, target_post_id, details)
  values(auth.uid(), 'delete_post', target, jsonb_build_object('author_id', post_author));
end;
$$;

grant execute on function public.admin_set_role(uuid, boolean, boolean) to authenticated;
grant execute on function public.admin_set_banned(uuid, boolean) to authenticated;
grant execute on function public.admin_set_verified(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_post(uuid) to authenticated;

notify pgrst, 'reload schema';
