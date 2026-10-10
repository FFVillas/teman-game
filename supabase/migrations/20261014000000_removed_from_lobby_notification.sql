-- "You were removed from a lobby": a notification for the player the leader
-- removes, so they find out (and the pop-up can tell them) instead of seeing
-- the lobby quietly vanish from their screen.
--
-- remove_member() records a removal exactly like leaving (status 'left'), so
-- the trigger tells the two apart by who is acting: a player who leaves is the
-- applicant themselves, a removal is someone else (the leader).
--
-- Needs 20261012000000_lobby_invites.sql (it holds the latest notify_on_application).
-- Never edit this file once it has run — fix with a new migration.

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'lobby_invite',
    'join_request',
    'application_accepted',
    'application_declined',
    'lobby_started',
    'rating_due',
    'friend_request',
    'review_received',
    'removed_from_lobby'
  )
);

-- Same function as 20261012000000, plus the removal branch at the end.
create or replace function public.notify_on_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  v_href text;
  v_applicant text;
  v_leader text;
  v_role text;
  v_rank text;
  v_detail text;
  v_became_pending boolean;
begin
  select lb.id, lb.name, lb.leader_id, lb.game_id, g.slug
    into l
  from public.lobbies lb
  join public.games g on g.id = lb.game_id
  where lb.id = new.lobby_id;

  v_href := '/lfg/' || l.slug || '/lobby/' || l.id;

  -- (OLD does not exist on an insert, so it is only read on updates.)
  if tg_op = 'INSERT' then
    v_became_pending := new.status = 'pending';
  else
    v_became_pending := new.status = 'pending' and old.status <> 'pending';
  end if;

  -- A new application, or a player who left applying again.
  if v_became_pending then
    select username into v_applicant from public.profiles where id = new.applicant_id;
    select name into v_role from public.game_roles where id = new.role_id;
    select r.name into v_rank
    from public.user_game_mapping ugm
    join public.game_ranks r on r.id = ugm.rank_id
    where ugm.user_id = new.applicant_id and ugm.game_id = l.game_id;

    v_detail := concat_ws(' · ', v_role, v_rank);
    if new.message is not null then
      v_detail := concat_ws(': ', nullif(v_detail, ''), '"' || left(new.message, 160) || '"');
    end if;

    -- One live request per person per lobby.
    delete from public.notifications
    where user_id = l.leader_id and kind = 'join_request'
      and actor_id = new.applicant_id and href = v_href and resolution is null;

    insert into public.notifications (user_id, kind, title, body, actor_id, href, ref_id)
    values (
      l.leader_id,
      'join_request',
      coalesce(v_applicant, 'Someone') || ' wants to join ' || l.name,
      nullif(v_detail, ''),
      new.applicant_id,
      v_href,
      new.id
    );

  elsif tg_op = 'UPDATE' then
    if old.status = new.status then
      return null;
    end if;

    if new.status = 'accepted' then
      update public.notifications
      set resolution = 'accepted', read_at = coalesce(read_at, now())
      where ref_id = new.id and kind = 'join_request' and resolution is null;

      -- They are in now, so an invite still waiting for them is moot.
      update public.lobby_invites
      set status = 'cancelled', decided_at = now()
      where lobby_id = new.lobby_id and invitee_id = new.applicant_id
        and status = 'pending';

      if not exists (
        select 1 from public.lobby_invites
        where lobby_id = new.lobby_id and invitee_id = new.applicant_id
          and status = 'accepted' and decided_at = now()
      ) then
        insert into public.notifications (user_id, kind, title, body, actor_id, href)
        values (new.applicant_id, 'application_accepted',
                'You''re in ' || l.name, 'The leader accepted your application.',
                l.leader_id, v_href);
      end if;

    elsif new.status = 'declined' then
      update public.notifications
      set resolution = 'declined', read_at = coalesce(read_at, now())
      where ref_id = new.id and kind = 'join_request' and resolution is null;

      select username into v_leader from public.profiles where id = l.leader_id;
      insert into public.notifications (user_id, kind, title, actor_id, href)
      values (new.applicant_id, 'application_declined',
              coalesce(v_leader, 'The leader') || ' declined your application to ' || l.name,
              l.leader_id, v_href);

    elsif new.status = 'left' and old.status = 'pending' then
      -- Withdrawn: the request on the leader's screen is no longer real.
      delete from public.notifications
      where ref_id = new.id and kind = 'join_request' and resolution is null;

    elsif new.status = 'left' and old.status = 'accepted'
          and auth.uid() is not null and auth.uid() <> new.applicant_id then
      -- Someone else ended their place: the leader removed them. (A player
      -- leaving is the applicant themselves and tells nobody.)
      insert into public.notifications (user_id, kind, title, body, actor_id, href)
      values (new.applicant_id, 'removed_from_lobby',
              'You were removed from ' || l.name,
              'The leader removed you from the lobby.',
              l.leader_id, v_href);
    end if;
  end if;

  return null;
end;
$$;
