-- Players delete their own account (Settings → Session & account).
--
-- Until now deletion went through an admin, because removing an auth record
-- needs more rights than a signed-in browser has. This function has them, and
-- only ever deletes the caller. It backs the right to have personal data
-- erased (UU PDP No. 27/2022).
--
-- What happens:
--   * Refused for staff accounts (another admin removes those) and while a
--     suspension is running, so deleting can't be used to dodge one.
--   * Reports filed by or about the player, and their sanctions, are removed
--     first: those keep their rows when a profile goes, and would otherwise
--     block the delete.
--   * Deleting the auth user cascades to the profile and everything that
--     belongs to it: games, tags, lobbies they lead, applications, invites,
--     friendships, blocks, messages, notifications, push tokens, and the
--     ratings they gave and received.
--   * The ratings they gave disappear, so everyone they rated gets their
--     reputation worked out again.
--
-- The profile picture is a Storage file; the app removes it before calling
-- this, since Storage files are deleted through the Storage API.

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rated uuid[];
  r uuid;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if public.is_admin(v_uid) then
    raise exception 'staff_account';
  end if;
  if exists (
    select 1 from public.sanction s
    where s.player_id = v_uid
      and s.type = 'suspension'
      and s.lifted_at is null
      and s.issued_at <= now()
      and (s.expires_at is null or s.expires_at > now())
  ) then
    raise exception 'suspended';
  end if;

  -- Whose reputation depends on ratings this player gave.
  select array_agg(distinct ratee_id) into v_rated
  from public.reviews where rater_id = v_uid;

  delete from public.sanction_reports
  where report_id in (
    select id from public.reports where reporter_id = v_uid or target_id = v_uid
  )
     or sanction_id in (select id from public.sanction where player_id = v_uid);
  update public.reports set sanction_id = null
  where sanction_id in (select id from public.sanction where player_id = v_uid);
  delete from public.reports where reporter_id = v_uid or target_id = v_uid;
  delete from public.sanction where player_id = v_uid;

  delete from auth.users where id = v_uid;

  foreach r in array coalesce(v_rated, '{}') loop
    perform public.recompute_reputation(r);
  end loop;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
