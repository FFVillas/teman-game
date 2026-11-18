-- Join requests a player can no longer take up are withdrawn by themselves.
--
-- A player can be in one live lobby at a time (`create_lobby` and
-- `respond_to_application` already refuse a second). But a *pending* request
-- doesn't count, so a player could ask to join lobby A, then start lobby B or
-- get accepted into lobby C, and A's leader was left with a request whose
-- Accept could only fail ("applicant_busy").
--
-- Now, the moment a player is in a live lobby (they start one, or they are
-- accepted into one, by application or by invite), their pending requests to
-- other live lobbies are withdrawn, exactly as if they had pressed Withdraw:
-- status 'left', and the existing notification trigger removes the request
-- from those leaders' bells.
--
-- Scheduled lobbies are left alone: a player may hold several of those.
-- Pending invites are left alone too: the invited player still decides, and
-- `respond_to_invite` refuses an accept that breaks the one-lobby rule.

create function public.withdraw_other_requests(p_user_id uuid, p_keep_lobby uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.applications a
  set status = 'left', decided_at = now(), left_at = now()
  from public.lobby l
  where l.id = a.lobby_id
    and a.applicant_id = p_user_id
    and a.status = 'pending'
    and a.lobby_id <> p_keep_lobby
    and l.status = 'open';
$$;

revoke all on function public.withdraw_other_requests(uuid, uuid) from public, anon, authenticated;

-- A lobby goes live: a new "Looking now" lobby, or a scheduled one switched
-- to now. The leader is in it, so their other requests go.
create function public.withdraw_requests_on_lobby_live()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'open' and (tg_op = 'INSERT' or old.status is distinct from 'open') then
    perform public.withdraw_other_requests(new.leader_id, new.id);
  end if;
  return null;
end;
$$;

create trigger lobby_live_withdraws_requests
  after insert or update of status on public.lobby
  for each row execute function public.withdraw_requests_on_lobby_live();

-- A player is accepted (an application accepted, or an invite accepted,
-- which writes an accepted application) into a lobby that is live or
-- playing. Joining a scheduled lobby withdraws nothing.
create function public.withdraw_requests_on_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted'
     and (tg_op = 'INSERT' or old.status is distinct from 'accepted')
     and exists (
       select 1 from public.lobby l
       where l.id = new.lobby_id and l.status in ('open', 'in_progress')
     )
  then
    perform public.withdraw_other_requests(new.applicant_id, new.lobby_id);
  end if;
  return null;
end;
$$;

create trigger application_accept_withdraws_requests
  after insert or update of status on public.applications
  for each row execute function public.withdraw_requests_on_accept();
