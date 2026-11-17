-- Realtime for the lobby screens under the thesis table names.
--
-- 20261016000000_realtime_lobby_tables.sql added `lobbies` to the
-- supabase_realtime publication. If it ran before 20261115000100_thesis_naming
-- the publication followed the rename (it stores the table's OID) and this does
-- nothing. If it never ran, it now fails, because `lobbies` no longer exists;
-- this adds the same tables under their current names instead.
--
-- Safe to run again: each table is added only when it is missing.
--
-- To undo: alter publication supabase_realtime drop table public.<table>;

do $$
declare
  target text;
begin
  foreach target in array array['lobby', 'applications', 'lobby_invites', 'friendships'] loop
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
