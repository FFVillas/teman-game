-- The profile edit form replaced two free-text fields with structured
-- inputs: languages became a dropdown list, and "usual play hours" became
-- day buttons + start/end time pickers + a timezone.
--
-- New migration rather than an edit to 20261003000000_profiles_dossier.sql:
-- that one is already applied.
--
-- Dropping and re-adding (not converting) is deliberate: free text such as
-- "Indonesia (Native), English (B2)" can't be mapped reliably onto a fixed
-- vocabulary, and the only rows affected are development test accounts.
alter table public.profiles
  drop column languages,
  drop column availability;

alter table public.profiles
  -- Picked from a dropdown, so stored as a list. The vocabulary lives in the
  -- app (src/data/profile-options.ts) so adding a language isn't a
  -- migration; the database only caps the count.
  add column languages text[] not null default '{}'
    check (cardinality(languages) <= 8),
  -- Usual play hours, structured so schedule overlap (a filter players
  -- search on) can be computed later. If end < start the window runs past
  -- midnight. Times are wall-clock in `timezone`, stored as a UTC offset
  -- such as 'UTC+07:00' (no per-country zones — the offset is all overlap
  -- needs).
  add column play_days text[] not null default '{}'
    check (play_days <@ array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']::text[]),
  add column play_start time,
  add column play_end time,
  add column timezone text check (char_length(timezone) <= 40),
  add constraint profiles_play_window_check
    check ((play_start is null) = (play_end is null));

-- Dropping a column also drops its column-level grant, so the replacements
-- need granting again or saving fails with "permission denied".
grant update (languages, play_days, play_start, play_end, timezone)
  on public.profiles to authenticated;
