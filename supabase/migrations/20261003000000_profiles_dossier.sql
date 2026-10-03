-- Profile slice — the "player dossier" fields the profile screen and the
-- edit form already show (age, gender, languages, usual play hours).
-- They're account-level (the same person whichever game they queue for),
-- unlike region/rank/role which are per game and arrive with
-- user_game_mapping in the Lobby slice.
--
-- A new migration rather than an edit to 20260919000000_profiles.sql:
-- that one already ran against the live database.
--
-- Everything is nullable — onboarding doesn't ask for any of this, and the
-- UI renders "Not set" rather than inventing a value.

-- ── Public dossier text fields ──────────────────────────────────────────
alter table public.profiles
  add column gender text check (gender in ('Male', 'Female', 'Prefer not to say')),
  add column languages text check (char_length(languages) <= 120),
  add column availability text check (char_length(availability) <= 200);

-- Column-level grants (see 20260919000000_profiles.sql): the API roles can
-- only update columns that are explicitly granted, so the new ones have to
-- be added here or saving the edit form fails with "permission denied".
grant update (gender, languages, availability)
  on public.profiles to authenticated;

-- ── Date of birth — private ─────────────────────────────────────────────
-- DESIGN NOTE: `profiles` is publicly readable (anon included), so a date of
-- birth stored there would be exposed through the API even though the UI
-- only shows an age. It lives in its own table that only the owner can
-- read; everyone else gets just the derived age, via profile_age() below.
-- Storing the date (not an age) means the age never goes stale.
create table public.profile_private (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Sanity range only; the 13+ rule is the trigger below (a CHECK can't use
  -- now(), and the limit moves every day).
  date_of_birth date check (date_of_birth between '1900-01-01' and '2100-01-01')
);

alter table public.profile_private enable row level security;

create policy "Users can read their own private profile"
  on public.profile_private for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own private profile"
  on public.profile_private for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own private profile"
  on public.profile_private for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.profile_private to authenticated;
grant insert (user_id, date_of_birth) on public.profile_private to authenticated;
grant update (date_of_birth) on public.profile_private to authenticated;

-- Minimum-age gate, enforced here so it can't be bypassed by calling the
-- API directly instead of using the form. The form checks the same rule
-- first so people get a readable message, not this exception.
create function public.enforce_minimum_age()
returns trigger
language plpgsql
as $$
begin
  if new.date_of_birth is not null
     and new.date_of_birth > (current_date - interval '13 years') then
    raise exception 'You must be at least 13 years old.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profile_private_minimum_age
  before insert or update on public.profile_private
  for each row execute procedure public.enforce_minimum_age();

-- The one thing about the date that is public: the age it works out to.
-- security definer so it can read past the owner-only RLS above; it
-- returns a whole number of years and never the date itself.
create function public.profile_age(profile_id uuid)
returns integer
language sql
stable
security definer set search_path = public
as $$
  select date_part('year', age(date_of_birth))::integer
  from public.profile_private
  where user_id = profile_id;
$$;

revoke execute on function public.profile_age(uuid) from public;
grant execute on function public.profile_age(uuid) to anon, authenticated;
