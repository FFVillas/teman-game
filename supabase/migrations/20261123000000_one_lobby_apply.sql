-- A player already in a live lobby can't ask to join another live one.
--
-- The one-live-lobby rule (a player leads or plays in at most one lobby that is
-- `open` or `in_progress`) was checked only when a request was *accepted*
-- (`respond_to_application`, "applicant_busy") and when an invite was
-- accepted. So a player sitting in lobby A could still send a request to
-- lobby B; B's leader then saw it, and pressing Accept could only fail.
--
-- Now `apply_to_lobby` refuses it up front with `already_in_live_lobby`, the
-- same code `create_lobby` uses, which the app already words as "You're
-- already in a live lobby. Leave or close it first."
--
-- Unchanged on purpose:
--   * Scheduled lobbies. A player may hold several of those and may ask to
--     join one for later while playing now; the rule is about *right now*.
--   * Pending requests don't count as "in a lobby": several pending requests
--     are fine, and the first acceptance withdraws the rest
--     (20261118000300_withdraw_other_requests.sql).
--
-- The body is 20261008000000_lobby_lifecycle.sql's, with the thesis names
-- (20261115000100_thesis_naming.sql) and the new check after the rank check.

create or replace function public.apply_to_lobby(
  p_lobby_id uuid,
  p_role_id smallint default null,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  l public.lobby%rowtype;
  v_taken integer;
  v_existing public.applications%rowtype;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  perform public.expire_stale_lobbies();

  -- Lock the lobby so two applications can't both take the last slot.
  select * into l from public.lobby where id = p_lobby_id for update;
  if not found then
    raise exception 'lobby_not_found';
  end if;
  if l.status in ('cancelled', 'completed') then
    raise exception 'lobby_closed';
  end if;
  if l.status = 'in_progress' then
    raise exception 'lobby_started';
  end if;
  if l.leader_id = v_uid then
    raise exception 'own_lobby';
  end if;

  select count(*) into v_taken from public.lobby_member where lobby_id = l.id;
  if v_taken >= l.capacity then
    raise exception 'lobby_full';
  end if;

  if p_role_id is not null and not exists (
    select 1 from public.game_role where id = p_role_id and game_id = l.game_id
  ) then
    raise exception 'role_invalid';
  end if;

  if not public.can_join_lobby(l.id, v_uid) then
    raise exception 'rank_not_eligible';
  end if;

  -- New: already leading or playing in another live lobby. Same lock as
  -- create_lobby and respond_to_application take for this player, so the
  -- check can't race an acceptance elsewhere.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  if l.status = 'open' and exists (
    select 1 from public.lobby_member lm
    join public.lobby o on o.id = lm.lobby_id
    where lm.user_id = v_uid
      and o.status in ('open', 'in_progress')
      and o.id <> l.id
  ) then
    raise exception 'already_in_live_lobby';
  end if;

  select * into v_existing
  from public.applications
  where lobby_id = l.id and applicant_id = v_uid;

  if found then
    if v_existing.status in ('pending', 'accepted') then
      raise exception 'already_applied';
    elsif v_existing.status = 'declined' then
      raise exception 'application_declined';
    end if;
    -- 'left': reopen the same row.
    update public.applications
    set status = 'pending', role_id = p_role_id, message = p_message,
        decided_at = null, created_at = now()
    where id = v_existing.id
    returning id into v_id;
    return v_id;
  end if;

  insert into public.applications (lobby_id, game_id, applicant_id, role_id, message)
  values (l.id, l.game_id, v_uid, p_role_id, p_message)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.apply_to_lobby(uuid, smallint, text) from public, anon;
grant execute on function public.apply_to_lobby(uuid, smallint, text) to authenticated;
