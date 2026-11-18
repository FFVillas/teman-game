-- Push notifications through Firebase Cloud Messaging (proposal 3.2.4, fitur 5).
--
-- How a push travels:
--   1. A player turns push on in Settings. The browser gets an FCM token for
--      this device and stores it with `register_push_token`.
--   2. Any new row in `notifications` (written by the lobby, invite and friend
--      triggers that already exist) fires `send_push_on_notification`, which
--      posts the title, link and that player's tokens to the app's
--      /api/push endpoint through pg_net. The call is asynchronous, so a slow
--      or failing push never blocks or undoes the insert.
--   3. /api/push (Next.js on Vercel) sends it through FCM with the Firebase
--      service account, and reports tokens FCM says are dead back through
--      `forget_push_tokens`.
--
-- Two values live in Supabase Vault, never in this file or the repo:
--   push_webhook_url     https://teman-game.vercel.app/api/push
--   push_webhook_secret  a long random string, the same as PUSH_WEBHOOK_SECRET
--                        on Vercel, so only this database can make the app push.
-- Until both exist, the trigger does nothing.

create extension if not exists pg_net with schema extensions;

-- ── tokens ──────────────────────────────────────────────────────────────
-- One row per device (browser profile or installed app) a player turned push
-- on for. A token belongs to one device, so it is the key; if another player
-- signs in on that device, the row moves to them.
create table public.push_tokens (
  token text primary key check (char_length(token) between 20 and 4096),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- "Chrome on Android" and the like, so a player could tell devices apart.
  device text check (char_length(device) <= 120),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- Players see their own devices. All writes go through the functions below.
create policy "own push tokens are readable"
  on public.push_tokens for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.push_tokens to authenticated;

-- Stores (or refreshes) this device's token for the signed-in player.
create function public.register_push_token(p_token text, p_device text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  insert into public.push_tokens (token, user_id, device)
  values (p_token, v_uid, left(p_device, 120))
  on conflict (token) do update
    set user_id = excluded.user_id,
        device = excluded.device,
        last_seen_at = now();
end;
$$;

-- Turning push off on this device, or signing out on it.
create function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_tokens
  where token = p_token and user_id = auth.uid();
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
revoke all on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- /api/push reports tokens FCM no longer accepts (app uninstalled, permission
-- withdrawn). It has no player session, so it proves itself with the shared
-- secret instead.
create function public.forget_push_tokens(p_secret text, p_tokens text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_count integer;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'push_webhook_secret';

  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'not_allowed';
  end if;

  delete from public.push_tokens where token = any (p_tokens);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.forget_push_tokens(text, text[]) from public;
grant execute on function public.forget_push_tokens(text, text[]) to anon, authenticated;

-- ── sending ─────────────────────────────────────────────────────────────
create function public.send_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
  v_tokens text[];
begin
  select array_agg(token) into v_tokens
  from public.push_tokens where user_id = new.user_id;
  if v_tokens is null then
    return null; -- push is off on every device of this player
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'push_webhook_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'push_webhook_secret';
  if v_url is null or v_secret is null then
    return null; -- not configured yet
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', v_secret
    ),
    body := jsonb_build_object(
      'id', new.id,
      'kind', new.kind,
      'title', new.title,
      'body', new.body,
      'href', coalesce(new.href, '/notifications'),
      'tokens', to_jsonb(v_tokens)
    ),
    timeout_milliseconds := 5000
  );
  return null;
end;
$$;

revoke all on function public.send_push_on_notification() from public, anon, authenticated;

create trigger notifications_send_push
  after insert on public.notifications
  for each row execute function public.send_push_on_notification();
