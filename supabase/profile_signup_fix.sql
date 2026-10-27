-- FreeText profile signup/storage RLS fix
-- Run this once in Supabase SQL Editor.
-- Safe to run more than once.

-- The current signup UI stores profile images under profiles/<type>/<user-id>/...
-- while the normal media policy expects the first folder to be the user id.
-- Allow both layouts, while still requiring the authenticated user's UUID.
drop policy if exists media_insert on storage.objects;
create policy media_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or (storage.foldername(name))[3] = auth.uid()::text
  )
);

-- Keep updates/deletes restricted to objects owned by the authenticated user.
drop policy if exists media_update on storage.objects;
create policy media_update
on storage.objects for update to authenticated
using (bucket_id = 'media' and owner_id = auth.uid()::text)
with check (bucket_id = 'media' and owner_id = auth.uid()::text);

drop policy if exists media_delete on storage.objects;
create policy media_delete
on storage.objects for delete to authenticated
using (bucket_id = 'media' and owner_id = auth.uid()::text);

-- Make the profile row writable by its authenticated owner.
drop policy if exists profiles_self_write on public.profiles;
create policy profiles_self_write
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);
