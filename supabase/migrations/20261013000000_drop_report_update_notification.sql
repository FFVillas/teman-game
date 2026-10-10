-- Drops the `report_update` notification kind ("Your report was reviewed").
--
-- Nothing ever wrote one: the report feature is not built, and when it is, the
-- reporter does not need to be pinged about a moderator's decision. If that
-- changes, add the kind back in the same migration that creates the trigger
-- that writes it, so the list of kinds never gets ahead of what exists.
--
-- Needs 20261012000000_lobby_invites.sql first (it set the previous list).
-- Never edit this file once it has run — fix with a new migration.

delete from public.notifications where kind = 'report_update';

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
    'review_received'
  )
);
