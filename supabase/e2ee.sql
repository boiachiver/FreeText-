-- FreeText end-to-end encryption migration.
-- Run this once in the Supabase SQL editor.
-- New messages are stored only as ciphertext + IV + per-recipient wrapped AES keys.

alter table public.profiles add column if not exists public_key text;
alter table public.messages add column if not exists ciphertext text;
alter table public.messages add column if not exists iv text;
alter table public.messages add column if not exists encrypted_keys jsonb;
alter table public.messages alter column body drop not null;

create index if not exists profiles_public_key_idx on public.profiles(id) where public_key is not null;
create index if not exists messages_encrypted_idx on public.messages(conversation_id, created_at) where ciphertext is not null;

-- Keep legacy message rows readable only to their conversation members while the app
-- migrates them. New app writes use body = null and the encrypted columns above.
-- Do not expose plaintext body in the client after this migration.
