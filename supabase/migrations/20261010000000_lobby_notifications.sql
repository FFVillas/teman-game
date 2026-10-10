-- Lobby notifications: the bell hears about applications and lobby starts.
--
-- 20261006000000_notifications.sql made notifications real and said that
-- cross-player ones ("Y applied to your lobby") must be written server-side,
-- by a trigger, so nobody can post as someone else. These are those triggers.
-- They run as the table owner and write only what the event itself implies.
--
--   someone applies          -> the leader gets a `join_request`
--   leader accepts           -> the applicant gets `application_accepted`
--   leader declines          -> the applicant gets `application_declined`
--   applicant withdraws      -> the leader's pending request is taken back
--   lobby starts             -> every member gets `lobby_started`
--   lobby starts or ends     -> requests nobody can accept any more are removed
--
-- `ref_id` (new) ties a join request to its application, so the Accept and
-- Decline buttons on /notifications can call respond_to_application for the
-- right row instead of only changing the notification.
--
-- Needs 20261006000000_notifications.sql (the teammates' migration) first.
--
-- Never edit this file once it has run — fix with a new migration.

alter table public.notifications add column ref_id uuid;

create index notifications_ref_idx on public.notifications (ref_id)
  where ref_id is not null;

create function public.notify_on_application()
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

      insert into public.notifications (user_id, kind, title, body, actor_id, href)
      values (new.applicant_id, 'application_accepted',
              'You''re in ' || l.name, 'The leader accepted your application.',
              l.leader_id, v_href);

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
    end if;
  end if;

  return null;
end;
$$;

create trigger applications_notify
  after insert or update of status on public.applications
  for each row execute function public.notify_on_application();

create function public.notify_on_lobby_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
begin
  if new.status = old.status then
    return null;
  end if;

  select slug into v_slug from public.games where id = new.game_id;

  -- Recruiting is over (started or ended): nobody can accept a request any
  -- more, so don't leave a button on the leader's screen that would fail.
  if new.status in ('started', 'completed', 'closed') then
    delete from public.notifications n
    using public.applications a
    where n.ref_id = a.id and a.lobby_id = new.id
      and n.kind = 'join_request' and n.resolution is null;
  end if;

  -- The group is going to play: tell everyone who is in, except the leader
  -- who just pressed the button.
  if new.status = 'started' and old.status in ('live', 'scheduled') then
    insert into public.notifications (user_id, kind, title, body, actor_id, href)
    select a.applicant_id, 'lobby_started',
           new.name || ' has started', 'Head over and join your teammates.',
           new.leader_id, '/lfg/' || v_slug || '/lobby/' || new.id
    from public.applications a
    where a.lobby_id = new.id and a.status = 'accepted';
  end if;

  return null;
end;
$$;

create trigger lobbies_notify
  after update of status on public.lobbies
  for each row execute function public.notify_on_lobby_change();

-- Trigger functions run as the owner whoever causes the event; nobody needs to
-- be able to call them by hand.
revoke all on function public.notify_on_application() from public, anon, authenticated;
revoke all on function public.notify_on_lobby_change() from public, anon, authenticated;
