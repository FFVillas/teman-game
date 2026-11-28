-- Under 18 is no longer refused; the app shows a notice instead.
--
-- 20261115000000_minimum_age_18.sql refused any date of birth under 18. The
-- revised plan keeps players under 18 but tells them, when they enter the
-- date, that UU PDP No. 27/2022 needs a parent or guardian's consent for a
-- child's data, and that continuing confirms they have it (`MinorNotice` in
-- src/components/profile/DossierFields.tsx). Logged in
-- docs/thesis-divergences.md.
--
-- The trigger keeps its name (20261003000000_profiles_dossier.sql points at
-- it) and now refuses only impossible dates: in the future, or more than 120
-- years ago. The column's own CHECK (1900 to 2100) stays.

create or replace function public.enforce_minimum_age()
returns trigger
language plpgsql
as $$
begin
  if new.date_of_birth is not null
     and (new.date_of_birth > current_date
          or new.date_of_birth < (current_date - interval '120 years')) then
    raise exception 'Enter a valid date of birth.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Check: a 16-year-old's date now passes, tomorrow does not.
do $check$
declare
  v_user uuid := (select user_id from public.profile_private limit 1);
  v_refused boolean := false;
begin
  if v_user is null then
    raise notice 'No profile_private row to test with; test skipped.';
    return;
  end if;

  begin
    update public.profile_private
    set date_of_birth = current_date - interval '16 years'
    where user_id = v_user;

    begin
      update public.profile_private
      set date_of_birth = current_date + 1
      where user_id = v_user;
    exception when check_violation then
      v_refused := true;
    end;
    if not v_refused then
      raise exception 'A date of birth in the future was accepted';
    end if;

    raise exception 'undo_test';
  exception when others then
    if sqlerrm <> 'undo_test' then
      raise;
    end if;
  end;

  raise notice 'enforce_minimum_age: under 18 accepted, future dates refused.';
end
$check$;
