-- FreeText private message media storage.
-- Run after schema.sql and e2ee.sql in the Supabase SQL editor.
-- The bucket is private. Objects are scoped to authenticated users and conversation membership.

insert into storage.buckets (id, name, public)
values ('message-media', 'message-media', false)
on conflict (id) do update set public = false;

alter table public.messages add column if not exists attachment_path text;
alter table public.messages add column if not exists attachment_name text;
alter table public.messages add column if not exists attachment_mime text;
alter table public.messages add column if not exists attachment_size bigint;

create index if not exists messages_attachment_path_idx on public.messages(attachment_path) where attachment_path is not null;

-- Uploads must live under <sender-user-id>/<conversation-id>/<message-id>-<safe-file-name>.
drop policy if exists message_media_insert on storage.objects;
create policy message_media_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'message-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = ((storage.foldername(name))[2])::uuid
      and cm.user_id = auth.uid()
  )
);

drop policy if exists message_media_read on storage.objects;
create policy message_media_read
on storage.objects for select to authenticated
using (
  bucket_id = 'message-media'
  and exists (
    select 1
    from public.messages m
    join public.conversation_members cm on cm.conversation_id = m.conversation_id
    where m.attachment_path = name
      and cm.user_id = auth.uid()
  )
);

drop policy if exists message_media_update on storage.objects;
create policy message_media_update
on storage.objects for update to authenticated
using (bucket_id = 'message-media' and owner_id = auth.uid()::text)
with check (bucket_id = 'message-media' and owner_id = auth.uid()::text);

drop policy if exists message_media_delete on storage.objects;
create policy message_media_delete
on storage.objects for delete to authenticated
using (bucket_id = 'message-media' and owner_id = auth.uid()::text);

notify pgrst, 'reload schema';
