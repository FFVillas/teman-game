-- Realtime for the lobby and friend screens, so a page updates when someone
-- else changes something instead of waiting for a reload:
--
--   lobbies        a lobby starts, ends, is edited, or a new one is posted
--   applications   someone applies, is accepted, leaves or is removed
--   lobby_invites  an invitation is sent, answered or taken back
--   friendships    a friend request arrives or is answered
--
-- Publishing a table exposes nothing extra: Realtime applies the same row
-- level security as a normal query, so each person only receives changes to
-- rows they could already read (the roster is public, a pending application
-- only reaches the applicant and the leader, and so on).
--
-- Same guard as 20261007000100_realtime_publication.sql: `alter publication
-- ... add table` has no IF NOT EXISTS, so this is safe to run again.
--
-- To undo: alter publication supabase_realtime drop table public.<table>;
--
-- Never edit this file once it has run — fix with a new migration.

do $$
declare
  target text;
begin
  foreach target in array array['lobbies', 'applications', 'lobby_invites', 'friendships'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        target
      );
    end if;
  end loop;
end $$;
