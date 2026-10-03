-- Account slice — the first vertical slice of the backend.
-- Everything else (lobby.leader_id, applications, reviews, reports,
-- friendships) references a profile, so this has to exist first.
--
-- Deliberately narrow: no roles/admin (teammates own that on a separate
-- branch), no connected_accounts (no working OAuth yet), no
-- user_game_mapping (that's part of the Lobby slice). See
-- docs/thesis-spec.md for the full 13-entity model this is one piece of.

-- Supabase Auth already owns auth.users (email, password, sessions) — we
-- never create that ourselves. This table is the 1:1 "everything else"
-- extension, linked by the same id.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  avatar_url text,
  region text,
  -- 1-5 Likert scale, "Sangat Kasual" to "Sangat Kompetitif" — Persamaan 3.2.
  playstyle smallint check (playstyle between 1 and 5),
  -- Fixed vocabulary from the proposal (Persamaan 3.4) — constrained so
  -- garbage tags can't get written and silently break the matching score
  -- later.
  personality_tags text[] not null default '{}'
    check (
      personality_tags <@ array[
        'Shot Caller',
        'Positive Mental Attitude',
        'Chill',
        'Never Surrender',
        'Flex Player'
      ]::text[]
    ),
  -- Both stay 0 until the Reputation slice lands and reviews start
  -- writing to them.
  reputation_score numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness — "Yonziii" and "yonziii" shouldn't both
-- be claimable.
create unique index profiles_username_lower_idx
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- Profiles are meant to be browsable (LFG discovery, viewing another
-- player's profile) without requiring login, so SELECT is open to
-- everyone — anon and logged-in alike.
create policy "Profiles are publicly readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- Only the owner can edit their own profile. No INSERT policy at all —
-- profile creation only happens through the trigger below, tied to a
-- real signup, so nobody can write a profile row for someone else's id
-- or create duplicates.
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- "Automatically expose new tables" was turned off at project creation,
-- so these grants are what actually let the API roles touch this table
-- at all — RLS above then filters which rows/columns within that.
grant select on public.profiles to anon, authenticated;
grant update (username, avatar_url, region, playstyle, personality_tags)
  on public.profiles to authenticated;

-- Auto-creates a profile row the moment someone signs up via Supabase
-- Auth — this is the glue that makes `profiles` actually populate.
-- security definer: runs as the function owner, not the calling user,
-- so it can insert into profiles even though there's no INSERT policy
-- for regular users.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
