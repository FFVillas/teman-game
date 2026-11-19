-- The admin console on real data (step 6; proposal use case "Meninjau
-- Laporan dan Memberikan Sanksi", Gambar L3.5 / L4.4).
--
-- Until now an admin wrote to `reports`, `sanction`, `sanction_reports` and
-- `admin_actions` directly, and the audit entry was a separate write the
-- browser could skip. From here every moderation step is one function that
-- checks the caller is an admin, requires a reason, does the change and
-- writes the audit entry in the same transaction. The direct write grants
-- are taken away, so there is no other path.
--
-- Also: what only admins may read (account emails and sign-in dates, the
-- reasons behind 1-2 star ratings) and what a suspended player is told when
-- they try to sign in.

-- ── helpers ─────────────────────────────────────────────────────────────

create function public.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_admin(v_uid) then
    raise exception 'not_admin';
  end if;
  return v_uid;
end;
$$;

create function public.admin_log(
  p_admin uuid, p_type text, p_target_type text, p_target uuid, p_summary text, p_reason text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.admin_actions (admin_id, type, target_type, target_id, summary, reason)
  values (p_admin, p_type, p_target_type, p_target, p_summary, p_reason);
$$;

create function public.require_admin_reason(p_reason text)
returns text
language plpgsql
immutable
as $$
begin
  if p_reason is null or char_length(btrim(p_reason)) < 10 then
    raise exception 'reason_too_short';
  end if;
  return btrim(p_reason);
end;
$$;

revoke all on function public.admin_log(uuid, text, text, uuid, text, text) from public, anon, authenticated;

-- ── reports ─────────────────────────────────────────────────────────────

-- Take a pending report so two moderators don't work the same case.
create function public.admin_claim_report(p_report uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
begin
  update public.reports
  set status = 'in_review', assigned_to = v_admin
  where id = p_report and status = 'pending';
  if not found then
    raise exception 'report_not_pending';
  end if;
  perform public.admin_log(v_admin, 'report_claimed', 'report', p_report,
    'Claimed report', 'Claimed the report for review');
end;
$$;

-- Not proven: the report closes as rejected, nothing happens to the player.
create function public.admin_dismiss_report(p_report uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_note text := public.require_admin_reason(p_note);
begin
  update public.reports
  set status = 'rejected',
      assigned_to = coalesce(assigned_to, v_admin),
      resolution_outcome = 'rejected',
      resolution_note = v_note,
      resolved_by = v_admin,
      resolved_at = now()
  where id = p_report and status in ('pending', 'in_review');
  if not found then
    raise exception 'report_closed';
  end if;
  perform public.admin_log(v_admin, 'report_dismissed', 'report', p_report,
    'Dismissed report', v_note);
end;
$$;

-- ── sanctions ───────────────────────────────────────────────────────────

-- A warning, or a suspension of 1, 3, 7 or 30 days (no permanent ban: the
-- thesis' sanction has a start and an end). Closes the given reports as
-- resolved and links them to the sanction.
create function public.admin_issue_sanction(
  p_player uuid,
  p_type text,
  p_duration_days integer,
  p_reason text,
  p_note text,
  p_report_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_note text := public.require_admin_reason(p_note);
  v_id uuid;
  v_summary text;
begin
  if p_type not in ('warning', 'suspension') then
    raise exception 'sanction_type_invalid';
  end if;
  if p_type = 'suspension' and coalesce(p_duration_days, 0) not in (1, 3, 7, 30) then
    raise exception 'duration_invalid';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'rule_required';
  end if;
  if public.is_admin(p_player) then
    raise exception 'cannot_sanction_staff';
  end if;
  if not exists (select 1 from public.profiles where id = p_player) then
    raise exception 'player_not_found';
  end if;

  insert into public.sanction (
    player_id, type, duration_days, reason, note, issued_by, issued_at, expires_at
  ) values (
    p_player, p_type,
    case when p_type = 'suspension' then p_duration_days end,
    btrim(p_reason), v_note, v_admin, now(),
    case when p_type = 'suspension' then now() + make_interval(days => p_duration_days) end
  )
  returning id into v_id;

  -- The reports this decision answers: only open ones about this player.
  insert into public.sanction_reports (sanction_id, report_id)
  select v_id, r.id
  from public.reports r
  where r.id = any (coalesce(p_report_ids, '{}'))
    and r.target_id = p_player
    and r.status in ('pending', 'in_review');

  update public.reports r
  set status = 'resolved',
      assigned_to = coalesce(r.assigned_to, v_admin),
      resolution_outcome = 'sanctioned',
      resolution_note = v_note,
      resolved_by = v_admin,
      resolved_at = now(),
      sanction_id = v_id
  where r.id in (select report_id from public.sanction_reports where sanction_id = v_id);

  v_summary := case
    when p_type = 'warning' then 'Warning'
    else p_duration_days || '-day suspension'
  end;
  perform public.admin_log(v_admin, 'sanction_issued', 'player', p_player, v_summary, v_note);
  return v_id;
end;
$$;

-- Ends a suspension early, or withdraws a warning. Kept, never deleted.
create function public.admin_lift_sanction(p_sanction uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_reason text := public.require_admin_reason(p_reason);
  s public.sanction%rowtype;
begin
  update public.sanction
  set lifted_at = now(), lifted_by = v_admin, lift_reason = v_reason
  where id = p_sanction and lifted_at is null
  returning * into s;
  if not found then
    raise exception 'sanction_not_active';
  end if;
  perform public.admin_log(v_admin, 'sanction_lifted', 'player', s.player_id,
    case when s.type = 'warning' then 'Lifted warning'
         else 'Lifted ' || s.duration_days || '-day suspension' end,
    v_reason);
end;
$$;

-- ── lobbies ─────────────────────────────────────────────────────────────

-- Cancels a lobby that hasn't finished. The existing lobby triggers tell the
-- members and clear requests nobody can accept any more.
create function public.admin_close_lobby(p_lobby uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_reason text := public.require_admin_reason(p_reason);
begin
  update public.lobby
  set status = 'cancelled', closed_at = now()
  where id = p_lobby and status in ('open', 'scheduled', 'in_progress');
  if not found then
    raise exception 'lobby_closed';
  end if;
  perform public.admin_log(v_admin, 'lobby_closed', 'lobby', p_lobby, 'Closed lobby', v_reason);
end;
$$;

-- Takes a member out, recorded like the leader removing them: they get the
-- "removed" notification and may apply again.
create function public.admin_remove_member(p_lobby uuid, p_player uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_reason text := public.require_admin_reason(p_reason);
  v_name text;
begin
  update public.applications
  set status = 'left', decided_at = now(), left_at = now()
  where lobby_id = p_lobby and applicant_id = p_player and status = 'accepted';
  if not found then
    raise exception 'not_in_lobby';
  end if;
  select username into v_name from public.profiles where id = p_player;
  perform public.admin_log(v_admin, 'member_removed', 'lobby', p_lobby,
    'Removed ' || coalesce(v_name, 'a member'), v_reason);
end;
$$;

-- ── what only admins read ───────────────────────────────────────────────

-- Account emails and sign-in dates live in auth.users, which the API can't
-- reach; admins get them for the player directory.
create function public.admin_accounts()
returns table (id uuid, email text, joined_at timestamptz, last_sign_in_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at
    from auth.users u
    join public.profiles p on p.id = u.id;
end;
$$;

-- The reasons behind 1-2 star ratings (proposal: "menjadi catatan untuk
-- keperluan moderasi"). Without the rater, so ratings stay anonymous even
-- to staff.
create function public.admin_low_ratings()
returns table (ratee_id uuid, stars smallint, reason text, lobby_id uuid, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  return query
    select r.ratee_id, r.stars, r.low_rating_reason, r.lobby_id, r.created_at
    from public.reviews r
    where r.low_rating_reason is not null
    order by r.created_at desc
    limit 1000;
end;
$$;

-- What a suspended player is told when they sign in: the rule and the dates,
-- never the moderator's note or who reported them.
create function public.my_active_suspension()
returns table (reason text, issued_at timestamptz, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.reason, s.issued_at, s.expires_at
  from public.sanction s
  where s.player_id = auth.uid()
    and s.type = 'suspension'
    and s.lifted_at is null
    and s.issued_at <= now()
    and (s.expires_at is null or s.expires_at > now())
  order by s.expires_at desc nulls first
  limit 1;
$$;

revoke all on function public.admin_accounts() from public, anon;
revoke all on function public.admin_low_ratings() from public, anon;
revoke all on function public.my_active_suspension() from public, anon;
grant execute on function public.admin_accounts() to authenticated;
grant execute on function public.admin_low_ratings() to authenticated;
grant execute on function public.my_active_suspension() to authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'admin_claim_report(uuid)',
    'admin_dismiss_report(uuid, text)',
    'admin_issue_sanction(uuid, text, integer, text, text, uuid[])',
    'admin_lift_sanction(uuid, text)',
    'admin_close_lobby(uuid, text)',
    'admin_remove_member(uuid, uuid, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- ── no other way in ─────────────────────────────────────────────────────
-- Players keep filing reports (their insert grant is untouched); every
-- moderation write now goes through the functions above.
revoke update on public.reports from authenticated;
revoke insert, update on public.sanction from authenticated;
revoke insert on public.sanction_reports from authenticated;
revoke insert on public.admin_actions from authenticated;
