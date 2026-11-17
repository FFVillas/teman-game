-- Reports a player can actually file: safer insert rights and evidence files.
--
-- 1. INSERT RIGHTS. `20260919000200_reports_moderation.sql` granted insert on
--    the whole table, so a reporter could write `status = 'resolved'`, an
--    assignee or a resolution into their own report. Players now insert only
--    the columns that describe what happened; status and everything a
--    moderator owns keep their defaults.
--
-- 2. NOT YOURSELF. A report on your own account is never meaningful.
--
-- 3. EVIDENCE. The report form offers a screenshot or clip (proposal: reports
--    hold "bukti"). Files go to the PRIVATE bucket `report-evidence`, under the
--    reporter's own folder; only that reporter and admins can read them.
--    `reports.evidence_path` stores the path (never a URL), pinned to the
--    reporter's folder, the same pattern as `profiles.avatar_path`.
--
-- Never edit this file once it has run — fix with a new migration.

-- ── 1. Insert rights ────────────────────────────────────────────────────
alter table public.reports add column evidence_path text;

alter table public.reports
  add constraint reports_evidence_path_check
  check (evidence_path is null or evidence_path like reporter_id::text || '/%');

revoke insert on public.reports from authenticated;
grant insert (reporter_id, target_id, lobby_id, reason, details, evidence_url, evidence_path)
  on public.reports to authenticated;

-- ── 2. Not yourself ─────────────────────────────────────────────────────
-- `not valid`: checks every new report without failing on any old test rows.
alter table public.reports
  add constraint reports_not_self check (reporter_id <> target_id) not valid;

-- ── 3. Evidence bucket ──────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-evidence', 'report-evidence', false, 5242880,
  array['image/png', 'image/jpeg', 'video/mp4']
)
on conflict (id) do nothing;

create policy "Reporters upload evidence to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'report-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Reporters and admins read evidence"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'report-evidence'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin(auth.uid())
    )
  );
