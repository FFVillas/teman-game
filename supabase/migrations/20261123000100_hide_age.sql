-- Players can hide their age from other people.
--
-- The date of birth is required (18+ rule, UU PDP) and stays private as
-- before; until now everyone could see the age it works out to. Age is
-- personal data the LFG doesn't need in order to work, so showing it is now
-- the player's choice: on by default, switched off in Edit profile.
--
-- The switch lives in `profile_private`, next to the date it is about, so the
-- preference itself is owner-only too. `profile_age()` is the only way anyone
-- reads an age; it now answers null to everyone but the owner when the switch
-- is off. The owner still sees their own age.

alter table public.profile_private
  add column show_age boolean not null default true;

grant update (show_age) on public.profile_private to authenticated;

create or replace function public.profile_age(profile_id uuid)
returns integer
language sql
stable
security definer set search_path = public
as $$
  select date_part('year', age(date_of_birth))::integer
  from public.profile_private
  where user_id = profile_id
    and (show_age or auth.uid() = profile_id);
$$;

revoke execute on function public.profile_age(uuid) from public;
grant execute on function public.profile_age(uuid) to anon, authenticated;
