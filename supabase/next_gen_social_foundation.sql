-- FreeText next-generation social foundation.
-- Idempotent migration for reels, communities, engagement, and safer admin RPC exposure.
create extension if not exists pgcrypto;

alter table public.posts add column if not exists content_type text not null default 'post' check (content_type in ('post','reel','video'));
alter table public.posts add column if not exists video_url text;
alter table public.posts add column if not exists thumbnail_url text;
alter table public.posts add column if not exists location_name text;
alter table public.posts add column if not exists hashtags text[] not null default '{}';
create index if not exists posts_content_type_created_idx on public.posts(content_type, created_at desc);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80), slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text, cover_url text, visibility text not null default 'public' check (visibility in ('public','private')),
  member_count integer not null default 0 check (member_count >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','moderator','owner')), joined_at timestamptz not null default now(), primary key (community_id,user_id)
);
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(), community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade, post_id uuid references public.posts(id) on delete set null,
  body text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.reel_likes (
  reel_id uuid not null references public.posts(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (reel_id,user_id)
);
create table if not exists public.reel_views (
  reel_id uuid not null references public.posts(id) on delete cascade, user_id uuid references public.profiles(id) on delete set null,
  watched_ms integer not null default 0 check (watched_ms >= 0), completed boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists communities_created_idx on public.communities(created_at desc);
create index if not exists community_members_user_idx on public.community_members(user_id);
create index if not exists community_posts_feed_idx on public.community_posts(community_id,created_at desc);
create index if not exists reel_views_feed_idx on public.reel_views(reel_id,created_at desc);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;
alter table public.reel_likes enable row level security;
alter table public.reel_views enable row level security;

drop policy if exists communities_public_read on public.communities;
create policy communities_public_read on public.communities for select to authenticated using (visibility = 'public' or owner_id = (select auth.uid()) or exists (select 1 from public.community_members m where m.community_id = id and m.user_id = (select auth.uid())));
drop policy if exists communities_owner_insert on public.communities;
create policy communities_owner_insert on public.communities for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists communities_owner_update on public.communities;
create policy communities_owner_update on public.communities for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists communities_owner_delete on public.communities;
create policy communities_owner_delete on public.communities for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists community_members_read on public.community_members;
create policy community_members_read on public.community_members for select to authenticated using (exists (select 1 from public.community_members x where x.community_id = community_id and x.user_id = (select auth.uid())) or exists (select 1 from public.communities c where c.id = community_id and c.visibility = 'public'));
drop policy if exists community_members_join on public.community_members;
create policy community_members_join on public.community_members for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists community_members_leave on public.community_members;
create policy community_members_leave on public.community_members for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists community_posts_read on public.community_posts;
create policy community_posts_read on public.community_posts for select to authenticated using (exists (select 1 from public.communities c where c.id = community_id and c.visibility = 'public') or exists (select 1 from public.community_members m where m.community_id = community_id and m.user_id = (select auth.uid())));
drop policy if exists community_posts_insert on public.community_posts;
create policy community_posts_insert on public.community_posts for insert to authenticated with check (author_id = (select auth.uid()) and exists (select 1 from public.community_members m where m.community_id = community_id and m.user_id = (select auth.uid())));
drop policy if exists community_posts_update on public.community_posts;
create policy community_posts_update on public.community_posts for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
drop policy if exists community_posts_delete on public.community_posts;
create policy community_posts_delete on public.community_posts for delete to authenticated using (author_id = (select auth.uid()));

drop policy if exists reel_likes_read on public.reel_likes;
create policy reel_likes_read on public.reel_likes for select to authenticated using (true);
drop policy if exists reel_likes_insert on public.reel_likes;
create policy reel_likes_insert on public.reel_likes for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists reel_likes_delete on public.reel_likes;
create policy reel_likes_delete on public.reel_likes for delete to authenticated using (user_id = (select auth.uid()));
drop policy if exists reel_views_insert on public.reel_views;
create policy reel_views_insert on public.reel_views for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists reel_views_read_own on public.reel_views;
create policy reel_views_read_own on public.reel_views for select to authenticated using (user_id = (select auth.uid()));

-- Admin RPCs remain callable by signed-in admins, but are no longer callable anonymously.
revoke execute on function public.admin_delete_post(uuid) from anon;
revoke execute on function public.admin_set_banned(uuid, boolean) from anon;
revoke execute on function public.admin_set_role(uuid, boolean, boolean) from anon;
revoke execute on function public.admin_set_verified(uuid, boolean) from anon;
revoke execute on function public.is_admin(uuid) from anon;
revoke execute on function public.is_conversation_member(uuid, uuid) from anon;
revoke execute on function public.is_super_admin(uuid) from anon;
revoke execute on function public.rls_auto_enable() from anon;
