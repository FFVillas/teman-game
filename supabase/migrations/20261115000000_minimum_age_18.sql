-- Minimum age 13 → 18.
--
-- The October 2026 proposal revision narrows the scope to adults: Indonesia's
-- personal data law (UU PDP No. 27 Tahun 2022) requires a parent or guardian's
-- consent before a child's personal data may be processed, and TemanGame has
-- no way to collect or verify that consent. Raising the floor is cheaper and
-- more honest than building a guardian-consent flow.
--
-- Only the function body changes; the trigger created in
-- `20261003000000_profiles_dossier.sql` already points at this name.
--
-- NOTE: triggers fire on insert and update only, so any row already stored
-- with an age between 13 and 17 stays as it is. Those accounts keep working
-- until someone edits that date. Check for them before UAT:
--
--   select user_id, date_of_birth
--   from public.profile_private
--   where date_of_birth > (current_date - interval '18 years');

create or replace function public.enforce_minimum_age()
returns trigger
language plpgsql
as $$
begin
  if new.date_of_birth is not null
     and new.date_of_birth > (current_date - interval '18 years') then
    raise exception 'You must be at least 18 years old.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
