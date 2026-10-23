-- FreeText production schema for Supabase
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  bio text default '',
  avatar_url text,
  phone text,
  is_admin boolean not null default false,
  is_verified boolean not null default false,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  caption text not null default '',
  image_url text,
  visibility text not null default 'public' check (visibility in ('public','followers','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

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

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  entity_id uuid,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image','video')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  message text not null,
  status text not null default 'open' check (status in ('open','reviewed','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_post_id uuid references public.posts(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = uid and is_admin = true and is_banned = false); $$;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.stories enable row level security;
alter table public.reports enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Public/social reads and owner writes.
create policy if not exists profiles_read on public.profiles for select using (true);
create policy if not exists profiles_self_write on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy if not exists profiles_admin_write on public.profiles for update using (public.is_admin()) with check (public.is_admin());

create policy if not exists posts_read on public.posts for select using (visibility = 'public' or author_id = auth.uid() or public.is_admin());
create policy if not exists posts_insert on public.posts for insert with check (author_id = auth.uid());
create policy if not exists posts_owner_update on public.posts for update using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
create policy if not exists posts_owner_delete on public.posts for delete using (author_id = auth.uid() or public.is_admin());

create policy if not exists likes_read on public.post_likes for select using (true);
create policy if not exists likes_write on public.post_likes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy if not exists comments_read on public.comments for select using (true);
create policy if not exists comments_write on public.comments for all using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy if not exists follows_read on public.follows for select using (true);
create policy if not exists follows_write on public.follows for all using (follower_id = auth.uid()) with check (follower_id = auth.uid());

create policy if not exists conversation_members_read on public.conversation_members for select using (user_id = auth.uid() or public.is_admin());
create policy if not exists conversation_members_write on public.conversation_members for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy if not exists conversations_read on public.conversations for select using (exists(select 1 from public.conversation_members cm where cm.conversation_id = id and cm.user_id = auth.uid()) or public.is_admin());
create policy if not exists conversations_insert on public.conversations for insert with check (created_by = auth.uid());
create policy if not exists messages_read on public.messages for select using (exists(select 1 from public.conversation_members cm where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()) or public.is_admin());
create policy if not exists messages_insert on public.messages for insert with check (sender_id = auth.uid() and exists(select 1 from public.conversation_members cm where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()));
create policy if not exists messages_update on public.messages for update using (sender_id = auth.uid() or public.is_admin());

create policy if not exists notifications_self on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy if not exists notifications_admin on public.notifications for select using (public.is_admin());
create policy if not exists stories_read on public.stories for select using (expires_at > now() or author_id = auth.uid() or public.is_admin());
create policy if not exists stories_write on public.stories for all using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
create policy if not exists reports_owner_insert on public.reports for insert with check (reporter_id = auth.uid());
create policy if not exists reports_admin on public.reports for all using (public.is_admin()) with check (public.is_admin());
create policy if not exists audit_admin on public.admin_audit_logs for select using (public.is_admin());
create policy if not exists audit_insert on public.admin_audit_logs for insert with check (public.is_admin() and admin_id = auth.uid());

create or replace function public.admin_set_banned(target uuid, banned boolean) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  update public.profiles set is_banned = banned, updated_at = now() where id = target;
  insert into public.admin_audit_logs(admin_id, action, target_user_id, details)
  values(auth.uid(), case when banned then 'ban_user' else 'unban_user' end, target, jsonb_build_object('banned', banned));
end; $$;

create or replace function public.admin_set_verified(target uuid, verified boolean) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  update public.profiles set is_verified = verified, updated_at = now() where id = target;
  insert into public.admin_audit_logs(admin_id, action, target_user_id, details)
  values(auth.uid(), case when verified then 'verify_user' else 'unverify_user' end, target, jsonb_build_object('verified', verified));
end; $$;

create or replace function public.admin_delete_post(target uuid) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  delete from public.posts where id = target;
  insert into public.admin_audit_logs(admin_id, action, target_post_id)
  values(auth.uid(), 'delete_post', target);
end; $$;

-- Create a profile automatically after signup.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, username, full_name, phone)
  values(new.id, coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email,''),'@',1)), coalesce(new.raw_user_meta_data->>'full_name',''), new.phone)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create index if not exists posts_created_idx on public.posts(created_at desc);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists reports_status_idx on public.reports(status, created_at desc);
