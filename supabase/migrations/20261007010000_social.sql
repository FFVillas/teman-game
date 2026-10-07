-- Social slice — friends, friend requests, and blocking. Backs
-- /social, /social/pending, /social/discover and /social/blocked, which
-- currently read from src/data/social-*.ts mock arrays.
--
-- Deliberately independent of the Lobby slice: a friendship is purely
-- player-to-player, so this can go live before lobbies/applications do.
-- /social/recent (teammates from past lobbies) stays mock for now — it
-- needs real match history, which arrives with the Lobby slice.
--
-- Not built here: online/idle presence. FriendCard's status dot needs a
-- realtime presence channel, a separate feature from the relationship
-- itself; every real friend reads as "offline" until that lands rather
-- than showing an invented status.

-- ── Blocks ──────────────────────────────────────────────────────────────
-- Created before Friendships: the friend-request insert policy below checks
-- this table, so it has to exist first.
--
-- One-directional and visible only to the blocker — the blocked player is
-- never told. A block and a friendship are independent: blocking someone
-- doesn't require unfriending them first (the app does both together), and
-- there's no FK between the two tables.
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (blocker_id <> blocked_id),
  unique (blocker_id, blocked_id)
);

alter table public.blocks enable row level security;

create policy "Users can view who they've blocked"
  on public.blocks for select
  to authenticated
  using (blocker_id = auth.uid());

create policy "Users can block someone"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy "Users can unblock someone"
  on public.blocks for delete
  to authenticated
  using (blocker_id = auth.uid());

grant select, insert, delete on public.blocks to authenticated;

-- ── Friendships ─────────────────────────────────────────────────────────
-- One row per relationship, not per direction. `requester_id` /
-- `addressee_id` record who asked whom (so the UI can tell "you sent this"
-- from "you received this"); `low_user_id` / `high_user_id` are generated
-- purely to make the unique constraint direction-independent, so A→B and
-- B→A can't both exist as separate pending requests.
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  low_user_id uuid generated always as (least(requester_id, addressee_id)) stored,
  high_user_id uuid generated always as (greatest(requester_id, addressee_id)) stored,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id),
  unique (low_user_id, high_user_id)
);

create index friendships_addressee_idx on public.friendships (addressee_id, status);
create index friendships_requester_idx on public.friendships (requester_id, status);

alter table public.friendships enable row level security;

-- Either side of the relationship can see it — the requester needs to see
-- their own pending request, the addressee needs to see it to answer it.
create policy "Either side can view a friendship"
  on public.friendships for select
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- You can only send a request as yourself, and only to someone who hasn't
-- blocked you (or whom you haven't blocked) — checked here too, not just
-- hidden from Discover, so the rule holds even if a client calls the API
-- directly.
create policy "Users can send a friend request"
  on public.friendships for insert
  to authenticated
  with check (
    requester_id = auth.uid()
    and status = 'pending'
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = requester_id and b.blocked_id = addressee_id)
         or (b.blocker_id = addressee_id and b.blocked_id = requester_id)
    )
  );

-- Only the addressee can accept, and only by flipping pending -> accepted.
create policy "Addressee can accept a request"
  on public.friendships for update
  to authenticated
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');

-- Either side can remove the row — the requester cancels a pending request,
-- the addressee declines one, or either of them unfriends an accepted one.
create policy "Either side can remove a friendship"
  on public.friendships for delete
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

grant select, insert, delete on public.friendships to authenticated;
grant update (status, responded_at) on public.friendships to authenticated;

-- ── notify_user: add friend_request ─────────────────────────────────────
-- Replaces the function from 20261006010000_notify_user_rpc.sql with the
-- same body plus one more allowed kind — sending a friend request is the
-- same "one player acting on another" shape as a lobby invite.
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
  if p_kind not in ('lobby_invite', 'join_request', 'friend_request') then
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
