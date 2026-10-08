-- Notifications — the last piece of the Account/Profile slice that is still
-- browser-only. `NotificationContext` currently seeds from
-- src/data/notifications.ts and keeps read state in localStorage, so a
-- notification disappears when you switch device and the bell count is
-- fiction. This table is what it reads instead.
--
-- Covers requirement 5 in §3.2.4 of the proposal ("Sistem Notifikasi
-- Real-time"). Delivery (Firebase Cloud Messaging through a service worker)
-- sits on top of this later; the row is the source of truth either way.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- Who receives it.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Mirrors NotificationKind in src/data/notifications.ts. Constrained so a
  -- typo can't create a kind the UI has no icon or styling for.
  kind text not null check (
    kind in (
      'lobby_invite',
      'join_request',
      'application_accepted',
      'application_declined',
      'lobby_started',
      'rating_due',
      'friend_request',
      'message',
      'review_received',
      'report_update'
    )
  ),
  title text not null check (char_length(title) <= 160),
  body text check (char_length(body) <= 400),
  -- Who triggered it, when there is a person behind it. Name and avatar are
  -- read through this reference rather than copied, so a renamed player
  -- doesn't leave stale text behind.
  actor_id uuid references public.profiles (id) on delete set null,
  -- Where clicking it should go, e.g. /lfg/valorant/lobby/<id>.
  href text check (char_length(href) <= 300),
  -- Null until read. A timestamp rather than a boolean: "when did they see
  -- it" is worth having, and it still answers "is it unread".
  read_at timestamptz,
  -- Set once an actionable notification (invite / join request) is answered.
  resolution text check (resolution in ('accepted', 'declined')),
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- The list is per person: nobody can read anyone else's.
create policy "Users read their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

-- Marking as read / answering an invite. The column grant below limits this
-- to read_at and resolution, so the text of a notification can't be edited.
create policy "Users update their own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Deliberately narrow: a client may only create a notification addressed to
-- itself. Real cross-player notifications (X invited you, Y applied to your
-- lobby) must be written server-side — by a trigger on `applications` /
-- `lobby_invites` or an edge function — once the Lobby slice exists.
-- Without this restriction any logged-in account could spam everyone.
create policy "Users create notifications addressed to themselves"
  on public.notifications for insert
  to authenticated
  with check (user_id = auth.uid());

grant select, insert on public.notifications to authenticated;
grant update (read_at, resolution) on public.notifications to authenticated;

-- The only query the app makes: this person's notifications, newest first.
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
