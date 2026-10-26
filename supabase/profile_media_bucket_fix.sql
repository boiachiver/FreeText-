-- FreeText profile photo storage fix
-- Run this once in the Supabase SQL Editor.
-- It is safe to run more than once.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists media_read on storage.objects;
drop policy if exists media_insert on storage.objects;
drop policy if exists media_update on storage.objects;
drop policy if exists media_delete on storage.objects;

create policy media_read
on storage.objects for select
using (bucket_id = 'media');

create policy media_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy media_update
on storage.objects for update to authenticated
using (bucket_id = 'media' and owner_id = auth.uid()::text)
with check (bucket_id = 'media' and owner_id = auth.uid()::text);

create policy media_delete
on storage.objects for delete to authenticated
using (bucket_id = 'media' and owner_id = auth.uid()::text);
