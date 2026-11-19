-- Push for chat: direct messages and lobby chat lines, without spamming.
--
-- Chat doesn't go through `notifications` (a DM isn't a bell item; it has its
-- own unread badge), so these triggers post to /api/push themselves, through
-- the same Vault settings and device tokens as 20261119000000_push_notifications.sql.
--
-- Against spam, per player and per conversation:
--   * a cooldown: after one push about a conversation, more messages in it
--     stay quiet for a while (1 minute for a DM, 3 for a lobby chat, where
--     several people talk at once);
--   * the push carries a `tag` per conversation, so a new one replaces the
--     last on the phone instead of stacking up.
-- Messages sent during the cooldown still arrive in the app as usual; only
-- the phone stays quiet.

-- When each player was last pushed about each conversation.
create table public.push_throttle (
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 'dm:<sender id>' or 'lobby:<lobby id>'
  thread text not null,
  last_sent_at timestamptz not null default now(),
  primary key (user_id, thread)
);

-- Only the functions below touch it.
alter table public.push_throttle enable row level security;

-- True (and the clock restarts) if this player may be pushed about this
-- conversation now; false while the cooldown runs.
create function public.push_slot_free(p_user uuid, p_thread text, p_cooldown interval)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  insert into public.push_throttle as t (user_id, thread, last_sent_at)
  values (p_user, p_thread, now())
  on conflict (user_id, thread) do update
    set last_sent_at = now()
    where t.last_sent_at < now() - p_cooldown
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

-- Posts one push to /api/push for one player, if they have push on anywhere
-- and the Vault settings exist. Asynchronous (pg_net), never blocks the insert.
create function public.send_push_to(p_user uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
  v_tokens text[];
begin
  select array_agg(token) into v_tokens from public.push_tokens where user_id = p_user;
  if v_tokens is null then
    return;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'push_webhook_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'push_webhook_secret';
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := p_payload || jsonb_build_object('tokens', to_jsonb(v_tokens)),
    timeout_milliseconds := 5000
  );
end;
$$;

revoke all on function public.push_slot_free(uuid, text, interval) from public, anon, authenticated;
revoke all on function public.send_push_to(uuid, jsonb) from public, anon, authenticated;

-- ── direct messages ─────────────────────────────────────────────────────
create function public.push_direct_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender text;
  v_thread text := 'dm:' || new.sender_id;
begin
  if not exists (select 1 from public.push_tokens where user_id = new.receiver_id) then
    return null;
  end if;
  if not public.push_slot_free(new.receiver_id, v_thread, interval '1 minute') then
    return null;
  end if;

  select username into v_sender from public.profiles where id = new.sender_id;
  perform public.send_push_to(new.receiver_id, jsonb_build_object(
    'id', new.id,
    'kind', 'direct_message',
    'title', coalesce(v_sender, 'New message'),
    'body', left(new.body, 140),
    'href', '/messages?user=' || coalesce(v_sender, ''),
    'tag', v_thread
  ));
  return null;
end;
$$;

revoke all on function public.push_direct_message() from public, anon, authenticated;

create trigger direct_messages_push
  after insert on public.direct_messages
  for each row execute function public.push_direct_message();

-- ── lobby chat ──────────────────────────────────────────────────────────
-- Everyone in the lobby but the sender; system lines ("X joined") don't push.
create function public.push_lobby_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby text;
  v_sender text;
  v_thread text := 'lobby:' || new.lobby_id;
  r record;
begin
  if new.kind <> 'message' then
    return null;
  end if;

  select name into v_lobby from public.lobby where id = new.lobby_id;
  select username into v_sender from public.profiles where id = new.sender_id;

  for r in
    select m.user_id
    from public.lobby_member m
    where m.lobby_id = new.lobby_id
      and m.user_id <> new.sender_id
      and exists (select 1 from public.push_tokens t where t.user_id = m.user_id)
  loop
    if public.push_slot_free(r.user_id, v_thread, interval '3 minutes') then
      perform public.send_push_to(r.user_id, jsonb_build_object(
        'id', new.id,
        'kind', 'lobby_message',
        'title', coalesce(v_lobby, 'Lobby chat'),
        'body', coalesce(v_sender, 'Someone') || ': ' || left(new.body, 120),
        'href', '/messages?lobby=' || new.lobby_id,
        'tag', v_thread
      ));
    end if;
  end loop;
  return null;
end;
$$;

revoke all on function public.push_lobby_message() from public, anon, authenticated;

create trigger lobby_messages_push
  after insert on public.lobby_messages
  for each row execute function public.push_lobby_message();
