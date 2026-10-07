-- Direct messages — the `direct_messages` entity from the proposal's ERD,
-- exactly as specified (sender, receiver, body, timestamp). No new entity,
-- no divergence to explain.
--
-- SCOPE NOTE: this is 1:1 chat only. Lobby chat is a different entity
-- (`lobby_messages`) and depends on `lobbies`, which is being built
-- separately — it is deliberately NOT in this migration, so two people can
-- work without colliding. Lobby chat stays on its sessionStorage stand-in
-- (src/lib/lobby-session.ts) until the Lobby slice lands.
--
-- There is no `conversations` table on purpose: a conversation is simply
-- every row between two people, which is what the ERD describes and what
-- keeps the entity count where the proposal put it.

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  -- Null until the receiver opens the conversation. A timestamp rather than
  -- a boolean: it still answers "is it unread", and keeps when it was seen.
  read_at timestamptz,
  created_at timestamptz not null default now(),
  -- Messaging yourself would show up as a conversation with no one.
  constraint direct_messages_not_self check (sender_id <> receiver_id)
);

alter table public.direct_messages enable row level security;

-- Only the two people in the conversation can read it. Note what this
-- means for moderation: an admin cannot read DMs through the API at all.
-- That is deliberate — if reporting a DM is ever added, the reporter should
-- attach the specific messages to the report rather than handing moderators
-- a window into every private conversation.
create policy "Participants read their own messages"
  on public.direct_messages for select
  to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

-- You can only send as yourself.
create policy "Players send as themselves"
  on public.direct_messages for insert
  to authenticated
  with check (sender_id = auth.uid());

-- Only the receiver marks a message read, and the column grant below limits
-- the update to `read_at` — nobody can edit the text of a sent message.
create policy "Receivers mark messages read"
  on public.direct_messages for update
  to authenticated
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());

grant select, insert on public.direct_messages to authenticated;
grant update (read_at) on public.direct_messages to authenticated;

-- No delete policy: a sent message can't be unsent or wiped by either side.
-- Worth stating in the thesis as an accountability choice — the same reason
-- sanctions are lifted rather than deleted.

-- The two queries the app makes: "my conversation with X, oldest first" and
-- "everything involving me, newest first".
create index direct_messages_pair_idx
  on public.direct_messages (sender_id, receiver_id, created_at);
create index direct_messages_receiver_idx
  on public.direct_messages (receiver_id, created_at desc);
