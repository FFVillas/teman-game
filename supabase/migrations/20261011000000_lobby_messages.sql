-- Lobby chat: the `lobby_messages` entity from the proposal's ERD.
--
-- Who can talk: the leader and accepted members of a lobby that is still open
-- (live, scheduled or started). A pending applicant, someone who left, and
-- everybody else can neither read nor write.
--
-- What happens when the lobby ends (completed or closed): the chat is closed
-- for the players, as the lobby screen says, but the rows are KEPT. That is
-- the "private copy for moderators" the first mock chat left as a TODO:
-- reports about a lobby rely on its chat log as evidence, so an admin can read
-- an ended lobby's chat and a player no longer can. (Direct messages are the
-- opposite on purpose: nobody, admins included, can read a private
-- conversation through the API.)
--
-- Two kinds of row:
--   message  written by a player
--   system   "X joined the lobby", "The lobby has started": written only by
--            the triggers below, never by a client, so nobody can fake one
--
-- A guard against flooding: at most 30 messages a minute per player.
--
-- Error code added here: chat_rate_limited.
--
-- Never edit this file once it has run — fix with a new migration.

create table public.lobby_messages (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies (id) on delete cascade,
  -- Null for system messages.
  sender_id uuid references public.profiles (id) on delete cascade,
  kind text not null default 'message' check (kind in ('message', 'system')),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  check ((kind = 'message') = (sender_id is not null))
);

-- The one query the app makes: this lobby's messages, oldest first.
create index lobby_messages_lobby_idx
  on public.lobby_messages (lobby_id, created_at);

-- Whether a player is in a lobby that is still open. Used by the policies
-- below; it runs as the owner so it doesn't depend on what the caller may
-- read, and takes the user as an argument so it can be tested directly.
create function public.can_chat_in_lobby(p_lobby_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id is not null and exists (
    select 1
    from public.lobbies l
    where l.id = p_lobby_id
      and l.status in ('live', 'scheduled', 'started')
      and (
        l.leader_id = p_user_id
        or exists (
          select 1 from public.applications a
          where a.lobby_id = l.id
            and a.applicant_id = p_user_id
            and a.status = 'accepted'
        )
      )
  );
$$;

revoke all on function public.can_chat_in_lobby(uuid, uuid) from public, anon;
grant execute on function public.can_chat_in_lobby(uuid, uuid) to authenticated;

alter table public.lobby_messages enable row level security;

create policy "Lobby members read their lobby's chat; admins read it as evidence"
  on public.lobby_messages for select
  to authenticated
  using (
    public.can_chat_in_lobby(lobby_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "Members write to their lobby's chat as themselves"
  on public.lobby_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and kind = 'message'
    and public.can_chat_in_lobby(lobby_id, auth.uid())
  );

-- No update or delete policy: a sent message can't be edited or unsent, for
-- the same accountability reason as direct messages.
grant select on public.lobby_messages to authenticated;
grant insert (lobby_id, sender_id, body) on public.lobby_messages to authenticated;

-- ── Flood guard ─────────────────────────────────────────────────────────
create function public.limit_lobby_chat_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'message' and (
    select count(*) from public.lobby_messages
    where sender_id = new.sender_id and created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'chat_rate_limited';
  end if;
  return new;
end;
$$;

create trigger lobby_messages_rate
  before insert on public.lobby_messages
  for each row execute function public.limit_lobby_chat_rate();

-- ── System messages ─────────────────────────────────────────────────────
create function public.chat_on_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if tg_op <> 'UPDATE' or old.status = new.status then
    return null;
  end if;

  select username into v_name from public.profiles where id = new.applicant_id;

  if new.status = 'accepted' then
    insert into public.lobby_messages (lobby_id, kind, body)
    values (new.lobby_id, 'system', coalesce(v_name, 'Someone') || ' joined the lobby');
  elsif new.status = 'left' and old.status = 'accepted' then
    -- Leaving and being removed are recorded the same way, so both read this.
    insert into public.lobby_messages (lobby_id, kind, body)
    values (new.lobby_id, 'system', coalesce(v_name, 'Someone') || ' left the lobby');
  end if;

  return null;
end;
$$;

create trigger applications_chat
  after update of status on public.applications
  for each row execute function public.chat_on_application();

create function public.chat_on_lobby_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return null;
  end if;

  if new.status = 'started' then
    insert into public.lobby_messages (lobby_id, kind, body)
    values (new.id, 'system', 'The lobby has started. Good luck!');
  elsif new.status = 'live' and old.status = 'started' then
    insert into public.lobby_messages (lobby_id, kind, body)
    values (new.id, 'system', 'Recruiting is open again');
  end if;

  return null;
end;
$$;

create trigger lobbies_chat
  after update of status on public.lobbies
  for each row execute function public.chat_on_lobby_status();

revoke all on function public.limit_lobby_chat_rate() from public, anon, authenticated;
revoke all on function public.chat_on_application() from public, anon, authenticated;
revoke all on function public.chat_on_lobby_status() from public, anon, authenticated;

-- ── Realtime ────────────────────────────────────────────────────────────
-- Publish the table so a new message reaches an open page. Same guard as
-- 20261007000100_realtime_publication.sql: safe to run again.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'lobby_messages'
  ) then
    alter publication supabase_realtime add table public.lobby_messages;
  end if;
end $$;
