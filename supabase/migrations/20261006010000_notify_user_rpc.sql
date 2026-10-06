-- Cross-player notification delivery.
--
-- 20261006000000_notifications.sql deliberately only lets a caller insert a
-- notification addressed to themselves (`user_id = auth.uid()`) — otherwise
-- any account could spam anyone. That's fine for self-addressed kinds like
-- `application_accepted` ("you accepted them"), but a genuine cross-player
-- notification ("X invited you to a lobby", "Y wants to join yours") is
-- necessarily addressed to someone else.
--
-- The Lobby slice (`lobbies`, `applications`, `lobby_invites`) doesn't exist
-- yet, so there's no table to hang a trigger off. This function is the
-- interim mechanism: security definer, so it can insert past the self-only
-- policy, but it only ever writes `actor_id = auth.uid()` — a caller can
-- notify someone else, but only ever "as themselves", never impersonating
-- another actor. Once the Lobby slice lands, a trigger on `lobby_invites` /
-- `applications` can call this same function (or be replaced by one) rather
-- than every call site reinventing the check.
create function public.notify_user(
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
  -- Narrow on purpose: only kinds that are inherently "one player acting on
  -- another" go through here. Everything else (ratings, reviews, reports,
  -- the self-addressed application_accepted/declined) stays on the
  -- self-only insert policy or waits for its own server-side trigger —
  -- widening this list is a one-line migration when a kind needs it.
  if p_kind not in ('lobby_invite', 'join_request') then
    raise exception 'notify_user: % is not a cross-player notification kind', p_kind;
  end if;

  if auth.uid() is null then
    raise exception 'notify_user: must be called by an authenticated user';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'notify_user: use a direct insert to notify yourself';
  end if;

  -- Spam guard: this is the one function that lets an account write into
  -- someone else's notifications, so it's the one place that needs a rate
  -- limit. 20 cross-player notifications/minute comfortably covers inviting
  -- a full lobby's worth of players at once.
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

revoke execute on function public.notify_user(uuid, text, text, text, text) from public;
grant execute on function public.notify_user(uuid, text, text, text, text) to authenticated;
