-- FreeText production message/media compatibility fix
-- Run this in Supabase SQL Editor after schema.sql.
-- Safe to run more than once.

begin;

-- ============================================================
-- 1. MESSAGE COLUMNS USED BY THE REAL CHAT CLIENT
-- ============================================================

alter table public.messages
  alter column body drop not null;

alter table public.messages
  add column if not exists ciphertext text,
  add column if not exists iv text,
  add column if not exists encrypted_keys jsonb,
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size bigint;

-- Keep message types compatible with the chat client.
alter table public.messages drop constraint if exists messages_message_type_check;
alter table public.messages
  add constraint messages_message_type_check
  check (message_type in ('text','image','video','audio','file'));

create index if not exists messages_attachment_idx
  on public.messages(conversation_id, created_at)
  where attachment_path is not null;

-- ============================================================
-- 2. PRIVATE MESSAGE-MEDIA BUCKET
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'message-media',
  'message-media',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ];

-- ============================================================
-- 3. SECURE STORAGE POLICIES
-- Path format created by FreeText:
-- message-media/<sender_user_id>/<conversation_id>/<message_id>-<filename>
-- ============================================================

drop policy if exists "message media upload" on storage.objects;
drop policy if exists "message media read" on storage.objects;
drop policy if exists "message media update" on storage.objects;
drop policy if exists "message media delete" on storage.objects;

after insert;

create policy "message media upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'message-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = ((storage.foldername(name))[2])::uuid
      and cm.user_id = auth.uid()
  )
);

create policy "message media read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'message-media'
  and exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = ((storage.foldername(name))[2])::uuid
      and cm.user_id = auth.uid()
  )
);

create policy "message media update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'message-media'
  and owner_id = auth.uid()::text
)
with check (
  bucket_id = 'message-media'
  and owner_id = auth.uid()::text
);

create policy "message media delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'message-media'
  and owner_id = auth.uid()::text
);

commit;

notify pgrst, 'reload schema';
