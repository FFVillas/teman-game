-- What other players see about someone's reputation and conduct.
--
-- Proposal 3.3.1.2: a profile shows the plain star average with how many
-- players rated it; anyone rated by fewer than five different players is
-- labelled "Pemain Baru"; the lobby card shows every member's reputation; the
-- sanction history is on the profile; and a player under an active suspension
-- is left out of recommendations before anything is scored.
--
-- 1. `rater_count(profiles)` and `is_suspended(profiles)` are COMPUTED COLUMNS:
--    PostgREST lets a select ask for them like ordinary columns, including
--    inside a nested select, so the lobby list gets them in the same request.
--    They are security definer because `reviews` and `sanction` are closed to
--    clients; each returns one number or flag, never who rated whom.
--
-- 2. `sanction_history(p_user)` is the public part of a player's sanctions:
--    type, the rule broken, and dates. The moderator's internal note and who
--    issued it stay hidden (the same split as /account-restricted). A sanction
--    that was lifted is left out: it was withdrawn, so showing it would count
--    against the player for something that no longer stands.
--
-- Never edit this file once it has run — fix with a new migration.

create function public.rater_count(p public.profiles)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct r.rater_id)::int
  from public.reviews r
  where r.ratee_id = p.id
    and r.effective_at is not null
    and r.effective_at <= now();
$$;

create function public.is_suspended(p public.profiles)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sanction s
    where s.player_id = p.id
      and s.type = 'suspension'
      and s.lifted_at is null
      and s.issued_at <= now()
      and (s.expires_at is null or s.expires_at > now())
  );
$$;

create function public.sanction_history(p_user uuid)
returns table (
  type text,
  reason text,
  issued_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.type, s.reason, s.issued_at, s.expires_at
  from public.sanction s
  where s.player_id = p_user and s.lifted_at is null
  order by s.issued_at desc;
$$;

revoke all on function public.rater_count(public.profiles) from public;
revoke all on function public.is_suspended(public.profiles) from public;
revoke all on function public.sanction_history(uuid) from public;
grant execute on function public.rater_count(public.profiles) to anon, authenticated;
grant execute on function public.is_suspended(public.profiles) to anon, authenticated;
grant execute on function public.sanction_history(uuid) to anon, authenticated;
