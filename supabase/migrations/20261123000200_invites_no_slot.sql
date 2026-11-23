-- Invites no longer hold a slot.
--
-- Until now a pending invite took an open slot (20261012000000_lobby_invites.sql):
-- a lobby short of four players could send exactly four invites, and if one
-- of them never answered (AFK, asleep, not interested) the leader was stuck
-- waiting, unable to ask anyone else. Now:
--
--   * A leader may have up to TWO pending invites per open slot (4 open
--     slots -> 8 invites). Enough to over-ask, not enough to spam everyone.
--     Over that: `no_invite_slots`, as before.
--   * The first to accept gets the slot; accepting still checks the lobby
--     isn't full (respond_to_invite, unchanged), so nobody can overfill it.
--   * The moment the lobby is full, every invite still pending lapses
--     (`expired`), and the existing notification trigger clears it from the
--     invitees' bells, so nobody is left with an Accept that can only fail.
--     If someone later leaves, the leader invites again.
--
-- The 30-per-hour rate limit stays. Everything else in invite_to_lobby is
-- unchanged: this is 20261012000000's body with the thesis names
-- (20261115000100_thesis_naming.sql) and the slot check replaced.

create or replace function public.invite_to_lobby(p_lobby_id uuid, p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  l public.lobby%rowtype;
  v_members integer;
  v_pending integer;
  v_existing public.lobby_invites%rowtype;
  v_had_invite boolean;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  perform public.expire_stale_lobbies();

  select * into l from public.lobby where id = p_lobby_id for update;
  if not found then
    raise exception 'lobby_not_found';
  end if;
  if l.leader_id <> v_uid then
    raise exception 'not_leader';
  end if;
  if l.status in ('cancelled', 'completed') then
    raise exception 'lobby_closed';
  end if;
  if l.status = 'in_progress' then
    raise exception 'lobby_started';
  end if;
  if p_user_id = v_uid then
    raise exception 'own_lobby';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'player_not_found';
  end if;

  if exists (
    select 1 from public.lobby_member where lobby_id = l.id and user_id = p_user_id
  ) then
    raise exception 'already_member';
  end if;
  -- They asked already: the leader answers that application instead.
  if exists (
    select 1 from public.applications
    where lobby_id = l.id and applicant_id = p_user_id and status = 'pending'
  ) then
    raise exception 'invitee_applied';
  end if;

  if not public.can_join_lobby(l.id, p_user_id) then
    raise exception 'rank_not_eligible';
  end if;

  if l.status = 'open' and exists (
    select 1 from public.lobby_member lm
    join public.lobby o on o.id = lm.lobby_id
    where lm.user_id = p_user_id and o.status in ('open', 'in_progress') and o.id <> l.id
  ) then
    raise exception 'applicant_busy';
  end if;

  select * into v_existing
  from public.lobby_invites
  where lobby_id = l.id and invitee_id = p_user_id;
  v_had_invite := found;
  if v_had_invite then
    if v_existing.status = 'pending' then
      raise exception 'already_invited';
    elsif v_existing.status = 'declined' then
      -- They said no; asking again would be pestering.
      raise exception 'invite_declined';
    end if;
  end if;

  -- New: invites don't hold slots. Full is full; below that, up to two
  -- pending invites per open slot.
  select count(*) into v_members from public.lobby_member where lobby_id = l.id;
  if v_members >= l.capacity then
    raise exception 'lobby_full';
  end if;
  select count(*) into v_pending
  from public.lobby_invites where lobby_id = l.id and status = 'pending';
  if v_pending >= 2 * (l.capacity - v_members) then
    raise exception 'no_invite_slots';
  end if;

  if (
    select count(*) from public.lobby_invites
    where inviter_id = v_uid and created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'invite_rate_limited';
  end if;

  if v_had_invite then
    update public.lobby_invites
    set status = 'pending', inviter_id = v_uid, created_at = now(), decided_at = null
    where id = v_existing.id
    returning id into v_id;
  else
    insert into public.lobby_invites (lobby_id, invitee_id, inviter_id)
    values (l.id, p_user_id, v_uid)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

revoke all on function public.invite_to_lobby(uuid, uuid) from public, anon;
grant execute on function public.invite_to_lobby(uuid, uuid) to authenticated;

-- Full lobby: the invites still out can only fail on Accept, so they lapse.
-- respond_to_invite marks the accepted invite before it writes the
-- application, so this never touches the invite that filled the last slot.
create function public.expire_invites_when_full()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted'
     and (tg_op = 'INSERT' or old.status is distinct from 'accepted')
     and (select count(*) from public.lobby_member where lobby_id = new.lobby_id)
         >= (select capacity from public.lobby where id = new.lobby_id)
  then
    update public.lobby_invites
    set status = 'expired', decided_at = now()
    where lobby_id = new.lobby_id and status = 'pending';
  end if;
  return null;
end;
$$;

revoke all on function public.expire_invites_when_full() from public, anon, authenticated;

create trigger application_fills_lobby_expires_invites
  after insert or update of status on public.applications
  for each row execute function public.expire_invites_when_full();
