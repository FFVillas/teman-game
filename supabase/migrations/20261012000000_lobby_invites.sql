-- Lobby invites: a leader asks a player to join, and the bell tells them.
--
-- Until now an invite was only a mock: the button flipped to "Invited" and
-- nothing reached the other player. This makes it real, in the same shape as
-- applications (which are the same thing the other way round).
--
--   leader invites a player   -> the player gets a `lobby_invite`
--   player accepts            -> they join the roster (an accepted application)
--   player declines           -> the invite is closed, the notification resolved
--   leader takes it back      -> the invite is cancelled, the notification removed
--   lobby starts or ends      -> pending invites expire, their notifications go
--
-- A pending invite holds an open slot, so a leader can't invite more people
-- than the lobby has room for. Accepting is checked again at that moment
-- (capacity, rank, one live lobby), exactly like accepting an application.
--
-- Also in this migration:
--  * `message` is dropped from the notification kinds. Direct messages have
--    their own unread count on the navbar; a notification per message would
--    only have duplicated it, and nothing ever wrote one.
--  * `notify_user` no longer takes `lobby_invite` or `join_request`. Both are
--    written by triggers now, and leaving them open let any signed-in player
--    forge an invite with a title and link of their choosing.
--
-- Needs 20261010000000_lobby_notifications.sql first.
-- Never edit this file once it has run — fix with a new migration.

-- ── Notification kinds: drop `message` ──────────────────────────────────
delete from public.notifications where kind = 'message';

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
    'report_update'
  )
);

-- ── notify_user: friend requests only ───────────────────────────────────
create or replace function public.notify_user(
  p_user_id uuid,
  p_kind text,
  p_title text,
  p_body text default null,
  p_href text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_recent_count integer;
begin
  if p_kind not in ('friend_request') then
    raise exception 'notify_user: % is not a cross-player notification kind', p_kind;
  end if;

  if auth.uid() is null then
    raise exception 'notify_user: must be called by an authenticated user';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'notify_user: use a direct insert to notify yourself';
  end if;

  select count(*) into v_recent_count
  from public.notifications
  where actor_id = auth.uid()
    and created_at > now() - interval '1 minute';

  if v_recent_count >= 20 then
    raise exception 'notify_user: rate limit exceeded, try again shortly';
  end if;

  insert into public.notifications (user_id, kind, title, body, href, actor_id)
  values (p_user_id, p_kind, p_title, p_body, p_href, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- ── The table ───────────────────────────────────────────────────────────
create table public.lobby_invites (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  -- The lobby's leader at the time; the leader never changes, but keeping it
  -- here is what lets the policy and the rate limit avoid a join.
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  -- One row per player per lobby; inviting again after the leader took an
  -- invite back (or it lapsed) reopens the same row.
  unique (lobby_id, invitee_id)
);

create index lobby_invites_invitee_idx on public.lobby_invites (invitee_id)
  where status = 'pending';
create index lobby_invites_inviter_idx on public.lobby_invites (inviter_id, created_at);

alter table public.lobby_invites enable row level security;

-- The leader sees the invites they sent, the player sees the ones they got.
create policy "Leader and invitee read an invite"
  on public.lobby_invites for select to authenticated
  using (inviter_id = auth.uid() or invitee_id = auth.uid());

-- No insert/update/delete policy on purpose: every change goes through the
-- functions below, which check the rules.
grant select on public.lobby_invites to authenticated;

-- ── Invite ──────────────────────────────────────────────────────────────
-- Error codes: not_signed_in, lobby_not_found, not_leader, lobby_closed,
-- lobby_started, own_lobby, player_not_found, already_member, invitee_applied,
-- rank_not_eligible, applicant_busy, lobby_full, no_invite_slots,
-- already_invited, invite_declined, invite_rate_limited
create function public.invite_to_lobby(p_lobby_id uuid, p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  l public.lobbies%rowtype;
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

  select * into l from public.lobbies where id = p_lobby_id for update;
  if not found then
    raise exception 'lobby_not_found';
  end if;
  if l.leader_id <> v_uid then
    raise exception 'not_leader';
  end if;
  if l.status in ('closed', 'completed') then
    raise exception 'lobby_closed';
  end if;
  if l.status = 'started' then
    raise exception 'lobby_started';
  end if;
  if p_user_id = v_uid then
    raise exception 'own_lobby';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'player_not_found';
  end if;

  if exists (
    select 1 from public.lobby_members where lobby_id = l.id and user_id = p_user_id
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

  if l.status = 'live' and exists (
    select 1 from public.lobby_members lm
    join public.lobbies o on o.id = lm.lobby_id
    where lm.user_id = p_user_id and o.status in ('live', 'started') and o.id <> l.id
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

  -- A pending invite holds a slot.
  select count(*) into v_members from public.lobby_members where lobby_id = l.id;
  if v_members >= l.capacity then
    raise exception 'lobby_full';
  end if;
  select count(*) into v_pending
  from public.lobby_invites where lobby_id = l.id and status = 'pending';
  if v_members + v_pending >= l.capacity then
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

-- ── Answer ──────────────────────────────────────────────────────────────
-- Error codes: not_signed_in, invite_not_found, invite_not_pending,
-- lobby_closed, lobby_started, lobby_full, rank_not_eligible,
-- already_in_live_lobby
create function public.respond_to_invite(p_invite_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lobby_id uuid;
  i public.lobby_invites%rowtype;
  l public.lobbies%rowtype;
  v_taken integer;
  v_application public.applications%rowtype;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  perform public.expire_stale_lobbies();

  select lobby_id into v_lobby_id
  from public.lobby_invites where id = p_invite_id and invitee_id = v_uid;
  if not found then
    raise exception 'invite_not_found';
  end if;

  select * into l from public.lobbies where id = v_lobby_id for update;

  -- Re-read under the lock: the leader may have taken it back a moment ago.
  select * into i from public.lobby_invites where id = p_invite_id;
  if i.status <> 'pending' then
    raise exception 'invite_not_pending';
  end if;

  if not p_accept then
    update public.lobby_invites
    set status = 'declined', decided_at = now()
    where id = i.id;
    return;
  end if;

  if l.status in ('closed', 'completed') then
    raise exception 'lobby_closed';
  end if;
  if l.status = 'started' then
    raise exception 'lobby_started';
  end if;

  select count(*) into v_taken from public.lobby_members where lobby_id = l.id;
  if v_taken >= l.capacity then
    raise exception 'lobby_full';
  end if;

  -- Who is in has changed since the invite went out, so check the rank again.
  if not public.can_join_lobby(l.id, v_uid) then
    raise exception 'rank_not_eligible';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  if l.status = 'live' and exists (
    select 1 from public.lobby_members lm
    join public.lobbies o on o.id = lm.lobby_id
    where lm.user_id = v_uid and o.status in ('live', 'started') and o.id <> l.id
  ) then
    raise exception 'already_in_live_lobby';
  end if;

  -- Marked before the application changes: notify_on_application reads this
  -- (decided_at = now()) to know the player was invited rather than accepted
  -- from a request, and not tell them "the leader accepted your application".
  update public.lobby_invites
  set status = 'accepted', decided_at = now()
  where id = i.id;

  -- Joining is an accepted application, so the roster, the chat and the
  -- ratings need no second path.
  select * into v_application
  from public.applications
  where lobby_id = l.id and applicant_id = v_uid;
  if found then
    update public.applications
    set status = 'accepted', role_id = null, message = null,
        decided_at = now(), joined_at = now(), left_at = null
    where id = v_application.id;
  else
    insert into public.applications (
      lobby_id, game_id, applicant_id, status, decided_at, joined_at
    ) values (l.id, l.game_id, v_uid, 'accepted', now(), now());
  end if;
end;
$$;

-- ── Take an invite back ─────────────────────────────────────────────────
-- Error codes: not_signed_in, invite_not_found, invite_not_pending
create function public.cancel_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows integer;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  if not exists (
    select 1 from public.lobby_invites where id = p_invite_id and inviter_id = v_uid
  ) then
    raise exception 'invite_not_found';
  end if;

  update public.lobby_invites
  set status = 'cancelled', decided_at = now()
  where id = p_invite_id and status = 'pending';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'invite_not_pending';
  end if;
end;
$$;

revoke all on function public.invite_to_lobby(uuid, uuid) from public, anon;
revoke all on function public.respond_to_invite(uuid, boolean) from public, anon;
revoke all on function public.cancel_invite(uuid) from public, anon;
grant execute on function public.invite_to_lobby(uuid, uuid) to authenticated;
grant execute on function public.respond_to_invite(uuid, boolean) to authenticated;
grant execute on function public.cancel_invite(uuid) to authenticated;

-- ── Notifications ───────────────────────────────────────────────────────
create function public.notify_on_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  v_href text;
  v_inviter text;
  v_became_pending boolean;
begin
  if tg_op = 'INSERT' then
    v_became_pending := new.status = 'pending';
  else
    if old.status = new.status then
      return null;
    end if;
    v_became_pending := new.status = 'pending';
  end if;

  select lb.id, lb.name, g.slug, g.name as game_name, gm.label as mode_label
    into l
  from public.lobbies lb
  join public.games g on g.id = lb.game_id
  join public.game_modes gm on gm.id = lb.mode_id
  where lb.id = new.lobby_id;

  v_href := '/lfg/' || l.slug || '/lobby/' || l.id;

  if v_became_pending then
    select username into v_inviter from public.profiles where id = new.inviter_id;

    -- One live invite per lobby per person (the leader may invite again after
    -- taking one back).
    delete from public.notifications
    where user_id = new.invitee_id and kind = 'lobby_invite'
      and href = v_href and resolution is null;

    insert into public.notifications (user_id, kind, title, body, actor_id, href, ref_id)
    values (
      new.invitee_id,
      'lobby_invite',
      coalesce(v_inviter, 'A leader') || ' invited you to ' || l.name,
      l.game_name || ' · ' || l.mode_label,
      new.inviter_id,
      v_href,
      new.id
    );

  elsif new.status in ('accepted', 'declined') then
    update public.notifications
    set resolution = new.status, read_at = coalesce(read_at, now())
    where ref_id = new.id and kind = 'lobby_invite' and resolution is null;

  else
    -- Cancelled or expired: there is nothing left to answer.
    delete from public.notifications
    where ref_id = new.id and kind = 'lobby_invite' and resolution is null;
  end if;

  return null;
end;
$$;

create trigger lobby_invites_notify
  after insert or update of status on public.lobby_invites
  for each row execute function public.notify_on_invite();

-- Recruiting is over (started or ended): a pending invite can't be accepted
-- any more, so let it lapse rather than leave a button that would fail.
create function public.expire_invites_on_lobby_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('started', 'completed', 'closed') and old.status <> new.status then
    update public.lobby_invites
    set status = 'expired', decided_at = now()
    where lobby_id = new.id and status = 'pending';
  end if;
  return null;
end;
$$;

create trigger lobbies_expire_invites
  after update of status on public.lobbies
  for each row execute function public.expire_invites_on_lobby_change();

-- Same function as 20261010000000, with one change: a player who joined by
-- accepting an invite is not told "the leader accepted your application".
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
    end if;
  end if;

  return null;
end;
$$;

revoke all on function public.notify_on_invite() from public, anon, authenticated;
revoke all on function public.expire_invites_on_lobby_change() from public, anon, authenticated;
