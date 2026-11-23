-- ============================================================================
-- RESET SEMUA DATA PENGGUNA — database kembali seperti baru di-deploy.
--
-- NOT a migration. Jalankan manual di Supabase SQL Editor, dan HANYA kalau
-- memang mau mengosongkan semuanya. Tidak bisa di-undo.
--
-- DIHAPUS (semua baris):
--   akun login (auth.users, termasuk admin), profiles, profile_private,
--   game/rank/role pemain, tag pemain, lobi beserta lamaran, undangan, chat,
--   role dan tag lobi, DM, pertemanan, blokir, notifikasi, token push,
--   rating, laporan, sanksi, audit log admin, daftar admin.
--
-- DIPERTAHANKAN (data referensi dari migration):
--   game, game_modes, rank_tier, game_role, tag (5 tag kepribadian), news,
--   seluruh struktur tabel, fungsi, trigger, policy, dan Vault (push).
--
-- TIDAK BISA lewat SQL: file di Storage (foto profil, bukti laporan).
--   Supabase melarang hapus langsung dari storage.objects. Kosongkan lewat
--   Dashboard → Storage → bucket `avatars` dan `report-evidence` → pilih semua
--   → Delete.
--
-- Langkah 1 (opsional): jalankan blok PRATINJAU saja untuk melihat jumlahnya.
-- Langkah 2: jalankan blok RESET.
-- ============================================================================


-- ── PRATINJAU: berapa baris yang akan hilang ─────────────────────────────────
select 'auth.users' as tabel, count(*) from auth.users
union all select 'profiles', count(*) from public.profiles
union all select 'admins', count(*) from public.admins
union all select 'lobby', count(*) from public.lobby
union all select 'applications', count(*) from public.applications
union all select 'direct_messages', count(*) from public.direct_messages
union all select 'notifications', count(*) from public.notifications
union all select 'reviews', count(*) from public.reviews
union all select 'reports', count(*) from public.reports;


-- ── RESET ────────────────────────────────────────────────────────────────────
-- TRUNCATE tidak menjalankan trigger per baris, jadi tidak ada notifikasi,
-- push atau hitung ulang reputasi yang ikut terpicu saat menghapus.
begin;

truncate table
  public.admin_actions,
  public.sanction_reports,
  public.sanction,
  public.reports,
  public.review_tag,
  public.reviews,
  public.notifications,
  public.push_throttle,
  public.push_tokens,
  public.lobby_messages,
  public.lobby_invites,
  public.lobby_tag,
  public.lobby_required_role,
  public.applications,
  public.lobby,
  public.direct_messages,
  public.friendships,
  public.blocks,
  public.user_tag,
  public.user_game_roles,
  public.user_game_mapping,
  public.profile_private,
  public.admins,
  public.profiles
restart identity cascade;

-- Akun login. Sesi, identitas Google/Discord dan token reset ikut terhapus
-- (cascade di skema auth).
delete from auth.users;

commit;


-- ── CEK: data pengguna kosong, data referensi masih ada ─────────────────────
select 'auth.users (harus 0)' as cek, count(*) from auth.users
union all select 'profiles (harus 0)', count(*) from public.profiles
union all select 'lobby (harus 0)', count(*) from public.lobby
union all select 'game (harus 6)', count(*) from public.game
union all select 'rank_tier (> 0)', count(*) from public.rank_tier
union all select 'game_modes (> 0)', count(*) from public.game_modes
union all select 'tag (harus 5)', count(*) from public.tag;
