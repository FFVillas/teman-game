-- Match history: the completed lobbies a player played in, and who with.
--
-- The profile's "Recent match history", /profile/<user>/matches and the
-- rating screen all read this. A match is a `completed` lobby; a player played
-- in it if they led it, or were accepted and did not leave before it started
-- (the same rule as `played_in()`, which rating already uses).
--
-- Why a function and not a plain query: the viewer must know which teammates
-- THEY have already rated, and `reviews` is closed to clients so ratings stay
-- anonymous. This answers only for the viewer's own ratings (rater = the
-- caller), never who rated the viewer, so anonymity holds. For anyone else's
-- history `rated` and `can_rate` are null and false.
--
-- One row per (match, teammate). A lobby the player finished alone has no
-- teammates and so no rows: there is nobody to show or rate.
--
-- Never edit this file once it has run — fix with a new migration.

create function public.player_matches(p_user uuid)
returns table (
  lobby_id uuid,
  teammate_id uuid,
  teammate_was_leader boolean,
  teammate_role_id smallint,
  rated boolean,
  can_rate boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with players as (
    select l.id as lobby_id, l.leader_id as user_id, true as was_leader,
           null::smallint as role_id
    from public.lobby l
    where l.status = 'completed'
    union all
    select a.lobby_id, a.applicant_id, false, a.role_id
    from public.applications a
    join public.lobby l on l.id = a.lobby_id
    where l.status = 'completed'
      and a.status in ('accepted', 'left')
      and a.joined_at is not null
      and (a.left_at is null or a.left_at >= l.started_at)
  ),
  mine as (
    select p.lobby_id from players p where p.user_id = p_user
  ),
  own_reviews as (
    select r.lobby_id, r.ratee_id
    from public.reviews r
    where r.rater_id = p_user and p_user = auth.uid()
  )
  select
    t.lobby_id,
    t.user_id,
    t.was_leader,
    t.role_id,
    case when p_user = auth.uid() then o.ratee_id is not null end,
    p_user = auth.uid()
      and o.ratee_id is null
      and public.can_review(t.lobby_id, p_user, t.user_id)
  from players t
  join mine m on m.lobby_id = t.lobby_id
  left join own_reviews o on o.lobby_id = t.lobby_id and o.ratee_id = t.user_id
  where t.user_id <> p_user;
$$;

revoke all on function public.player_matches(uuid) from public;
grant execute on function public.player_matches(uuid) to anon, authenticated;
