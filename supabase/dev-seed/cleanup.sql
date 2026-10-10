-- Removes everything seed.sql made, and nothing else.
--
-- The demo players are the auth users whose email ends in
-- @demo.temangame.test. Deleting them removes their profiles, ranks, roles,
-- the lobbies they lead and every application they made (those all cascade).
-- Notifications you received because of them are removed first, so your bell
-- doesn't keep requests from people who no longer exist.
--
-- Your own account, profile, lobbies and notifications from real players are
-- untouched. If the demo made "My Demo Lobby" for you, that one goes too,
-- because it carries a demo applicant's request; any lobby you made yourself
-- stays, minus the demo applicants' applications.

delete from public.notifications
where actor_id in (select id from public.profiles where username like 'demo\_%');

delete from public.lobbies
where name = 'My Demo Lobby'
  and description = 'A lobby made by the demo script so you have something to manage.';

delete from auth.users where email like '%@demo.temangame.test';

select
  (select count(*) from public.profiles where username like 'demo\_%') as demo_players_left,
  (select count(*) from auth.users where email like '%@demo.temangame.test') as demo_users_left;
