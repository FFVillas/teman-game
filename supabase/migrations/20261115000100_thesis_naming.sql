-- Menyelaraskan nama tabel dan nilai status dengan ERD skripsi, plus kolom
-- playstyle pada lobi (Pb pada Persamaan 3.2).
--
-- Rencana lengkap: docs/proposal-revision-2026-10.md §3.1, §3.5, §6.0.
--
-- JALANKAN SEKALIGUS, SATU KALI, jangan dipotong per bagian.
--
-- ── Dua hal yang membuat urutannya penting ──────────────────────────────
--
-- 1. BADAN FUNGSI DITULIS ULANG SEBELUM ADA DML APA PUN.
--    Badan fungsi plpgsql disimpan sebagai TEKS dan baru diurai saat
--    dipanggil, jadi `alter table ... rename` tidak ikut memperbarui isinya.
--    Versi pertama migrasi ini menjalankan UPDATE status lebih dulu; UPDATE
--    itu memicu trigger notify_on_lobby_change() yang masih menyebut
--    public.games, dan seluruh migrasi gagal:
--
--      ERROR: 42P01: relation "public.games" does not exist
--      CONTEXT: PL/pgSQL function notify_on_lobby_change() line 9
--
-- 2. TRIGGER DIMATIKAN SELAMA PERPINDAHAN DATA.
--    Tabel lobi punya tiga trigger yang aktif saat status berubah
--    (lobbies_notify, lobbies_chat, lobbies_expire_invites). Yang paling
--    berbahaya chat_on_lobby_status(): begitu status 'started' berubah jadi
--    'in_progress' ia akan menyisipkan pesan sistem "The lobby has started"
--    ke chat SETIAP lobi yang sedang berjalan. Yang berubah di sini cuma
--    ejaan statusnya, bukan keadaan lobinya, jadi tidak boleh ada efek
--    samping sama sekali.
--
-- ── Kenapa bagian fungsi ditulis pakai pg_get_functiondef ───────────────
-- Ada 20 fungsi yang menyebut nama lama. Daripada menyalin ulang semuanya
-- (berisiko memakai versi yang sudah usang), langkah 2 membaca definisi yang
-- BENAR-BENAR hidup di database, mengganti namanya, lalu menjalankan ulang.
-- Tanda kutip ikut dicocokkan ('live', bukan live), sehingga 'lobby_started'
-- pada notifikasi tidak ikut terganti.
--
-- ── Kalau gagal di tengah ───────────────────────────────────────────────
-- Aman. SQL editor Supabase mengirim seluruh skrip sebagai satu pesan, dan
-- PostgreSQL membungkusnya dalam transaksi implisit: satu statement gagal,
-- semuanya dibatalkan. Sudah terbukti saat percobaan pertama.
--
-- YANG TIDAK DILAKUKAN DI SINI: menambah parameter p_playstyle ke
-- create_lobby/update_lobby. Itu mengubah signature sehingga fungsinya harus
-- dibuat ulang utuh — dan keduanya akan ditulis ulang lagi saat lobby_tag
-- masuk. Kolomnya disiapkan sekarang, pengisiannya menyusul.

-- ── 1. Nama tabel ───────────────────────────────────────────────────────
-- Indeks, foreign key, kebijakan RLS dan view ikut terbawa otomatis:
-- semuanya menyimpan OID, bukan nama.
alter table public.games       rename to game;
alter table public.lobbies     rename to lobby;
alter table public.game_ranks  rename to rank_tier;
alter table public.game_roles  rename to game_role;
alter table public.lobby_roles rename to lobby_required_role;

-- Skripsi menyebutnya tabel; di sini tetap view. Keanggotaan diturunkan dari
-- lobby.leader_id dan applications yang diterima, jadi tidak bisa melenceng
-- dari sumbernya. Dicatat sebagai penyimpangan sadar.
alter view public.lobby_members rename to lobby_member;

-- `profiles` sengaja TIDAK diubah jadi `user`: `user` kata kunci yang
-- dicadangkan PostgreSQL, jadi harus ditulis "user" selamanya. Skripsi versi
-- revisi sudah mengakui kredensial ditangani Supabase Auth.

-- ── 2. Tulis ulang badan fungsi (SEBELUM DML apa pun) ───────────────────
do $rewrite$
declare
  fn      record;
  src     text;
  updated text;
  changed int := 0;
begin
  for fn in
    select p.oid, p.proname, pg_get_functiondef(p.oid) as def
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind = 'f'
  loop
    src := fn.def;
    updated := src;

    -- Nama tabel. Semua rujukan di dalam fungsi berskema (public.x); yang
    -- tanpa skema hanya muncul di komentar berkas migrasi.
    -- Urutan penting: lobby_members dan lobby_roles lebih dulu, baru lobbies.
    updated := replace(updated, 'public.lobby_members', 'public.lobby_member');
    updated := replace(updated, 'public.lobby_roles',   'public.lobby_required_role');
    updated := replace(updated, 'public.lobbies',       'public.lobby');
    updated := replace(updated, 'public.game_ranks',    'public.rank_tier');
    updated := replace(updated, 'public.game_roles',    'public.game_role');
    updated := replace(updated, 'public.games',         'public.game');

    -- Nilai status, berikut tanda kutipnya.
    updated := replace(updated, '''live''',    '''open''');
    updated := replace(updated, '''started''', '''in_progress''');
    updated := replace(updated, '''closed''',  '''cancelled''');

    if updated <> src then
      execute updated;
      changed := changed + 1;
      raise notice 'ditulis ulang: %', fn.proname;
    end if;
  end loop;

  raise notice '--- % fungsi ditulis ulang ---', changed;
end
$rewrite$;

-- ── 3. Nilai status ─────────────────────────────────────────────────────
alter table public.lobby drop constraint lobbies_status_check;

-- Trigger dimatikan: ini penggantian ejaan, bukan perubahan keadaan lobi.
-- `user` artinya hanya trigger buatan kita; trigger sistem (foreign key)
-- tetap aktif.
alter table public.lobby disable trigger user;

update public.lobby
set status = case status
  when 'live'    then 'open'
  when 'started' then 'in_progress'
  when 'closed'  then 'cancelled'
  else status
end
where status in ('live', 'started', 'closed');

alter table public.lobby enable trigger user;

alter table public.lobby add constraint lobby_status_check
  check (status in ('open', 'scheduled', 'in_progress', 'completed', 'cancelled'));

alter table public.lobby alter column status set default 'open';

-- `full` sengaja tidak ditambahkan. Penuh atau tidak diturunkan dari capacity
-- dikurangi jumlah anggota; menyimpannya akan melenceng begitu ada yang keluar.

-- ── 4. Playstyle lobi (Pb) ──────────────────────────────────────────────
-- Boleh null selama create_lobby belum menerimanya; pembacanya jatuh kembali
-- ke playstyle pembuat lobi sampai migrasi lobby_tag mengisinya.
alter table public.lobby
  add column playstyle smallint check (playstyle between 1 and 5);

comment on column public.lobby.playstyle is
  'Pb pada Persamaan 3.2, skala 1-5 menurut Tabel 3.2. Milik lobi, bukan '
  'pembuatnya: leader yang kompetitif tetap boleh membuat lobi santai.';

-- ── 5. Periksa sendiri ──────────────────────────────────────────────────
-- Melempar exception kalau masih ada fungsi yang menyebut nama lama. Lebih
-- baik gagal di sini (dan ikut dibatalkan) daripada gagal nanti saat seorang
-- pemain memakai aplikasinya.
do $verify$
declare
  leftovers text;
  trig_off  text;
begin
  select string_agg(p.proname, ', ')
  into leftovers
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.prokind = 'f'
    and (
      pg_get_functiondef(p.oid) ~ 'public\.(lobbies|games|game_ranks|game_roles|lobby_roles|lobby_members)\M'
      or pg_get_functiondef(p.oid) ~ '''(live|started|closed)'''
    );

  if leftovers is not null then
    raise exception 'Masih memakai nama lama: %', leftovers;
  end if;

  -- Pastikan trigger benar-benar hidup lagi.
  select string_agg(tgname, ', ')
  into trig_off
  from pg_trigger
  where tgrelid = 'public.lobby'::regclass
    and not tgisinternal
    and tgenabled = 'D';

  if trig_off is not null then
    raise exception 'Trigger masih mati: %', trig_off;
  end if;

  raise notice 'Pemeriksaan lolos: nama lama bersih, trigger aktif.';
end
$verify$;
