-- Realtime: publish the two tables the app subscribes to, so a new row
-- reaches an open page without a reload.
--
-- `direct_messages` was added by hand in the SQL editor while testing; this
-- migration records that in the repo and adds `notifications` alongside it,
-- so a fresh project ends up in the same state.
--
-- Wrapped in a guard because `alter publication ... add table` has no
-- IF NOT EXISTS: re-running it on an already-published table fails with
-- "relation is already member of publication". This version is safe to run
-- as many times as you like.
--
-- Realtime applies the same RLS as a normal query, so publishing a table
-- exposes nothing extra: each subscriber only receives rows its policies
-- already let it read. The client must authenticate its socket
-- (`realtime.setAuth`) or it is treated as `anon` and simply receives
-- nothing — see src/lib/realtime.ts.
--
-- To undo: alter publication supabase_realtime drop table public.<table>;

do $$
declare
  target text;
begin
  foreach target in array array['direct_messages', 'notifications'] loop
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
