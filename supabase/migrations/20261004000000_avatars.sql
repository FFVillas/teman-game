-- Profile pictures. Uploaded files live in Supabase Storage; `profiles` only
-- records WHICH file, never a URL.
--
-- Why a path and not a URL: `profiles.avatar_url` was writable by its owner
-- (it is in the column grant), so a player could have pointed it at any
-- address on the internet — every visitor's browser would then fetch it
-- (tracking, hot-linked content). A path that the CHECK below pins to the
-- player's own storage folder cannot do that, and the app builds the URL
-- from it (src/lib/avatar.ts). It also keeps the door open to a CDN or image
-- transforms later without touching any stored data.
--
-- Nobody could have saved a valid avatar before this (there was no upload),
-- so every existing row is null and the new CHECK passes.

alter table public.profiles rename column avatar_url to avatar_path;

-- Column-level grants follow the column through the rename, so the owner can
-- still update it and nobody else can.

-- Shape: "<own user id>/<unix ms>.jpg" — exactly what the upload code
-- produces. A new file name per upload (rather than overwriting one fixed
-- name) means a replaced picture is never served stale from a cache.
alter table public.profiles
  add constraint profiles_avatar_path_check
  check (
    avatar_path is null
    or (
      avatar_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]+\.jpg$'
      and avatar_path like id::text || '/%'
    )
  );

-- ── Storage bucket ──────────────────────────────────────────────────────
-- Public: profile pictures are shown to everyone, logged in or not, so the
-- files are served straight from the public URL with no per-request check.
-- The limits below are enforced by Storage itself, as a backstop to the
-- browser resizing every upload to a 256×256 JPEG (about 20–40 KB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/jpeg']);

-- ── Who may write ───────────────────────────────────────────────────────
-- Reading a public bucket needs no policy; these only govern writes and the
-- player's own listing. Every rule pins the first folder of the object name
-- to the caller's user id, so nobody can touch someone else's files.
--
-- There is deliberately no UPDATE policy: files are never overwritten (each
-- upload gets a new name), so nobody needs to.
create policy "Users can upload to their own avatar folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deleting through the API needs SELECT as well as DELETE: the row has to be
-- visible to the caller before it can be removed.
create policy "Users can see their own avatar files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
