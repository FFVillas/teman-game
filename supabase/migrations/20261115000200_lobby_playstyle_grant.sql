-- Memberi hak baca kolom `lobby.playstyle`.
--
-- Perbaikan untuk `20261115000100_thesis_naming.sql`, yang menambahkan kolom
-- itu tanpa memberinya grant.
--
-- Kenapa terlewat: tabel lobi TIDAK memakai grant setingkat tabel. Migrasi
-- `20261008000000_lobby_lifecycle.sql` mencabut `select` pada seluruh tabel
-- lalu mengembalikannya kolom per kolom, supaya `discord_url` tidak pernah
-- terbaca lewat API. Kolom baru tidak mewarisi apa pun dari pola itu — jadi
-- `add column` menghasilkan kolom yang tidak bisa dibaca siapa pun.
--
-- Akibatnya belum terasa karena belum ada yang membaca `playstyle`. Tapi
-- begitu Persamaan 3.2 disambungkan, seluruh kueri yang menyertakan kolom ini
-- akan gagal dengan `42501 permission denied for table lobby` — pesan yang
-- menunjuk ke tabel, bukan ke kolomnya, jadi sangat membingungkan dicari.
--
-- PELAJARAN untuk migrasi berikutnya: setiap `add column` pada `lobby`,
-- `profiles`, atau `profile_private` harus diikuti `grant select (kolom)`.
-- Ketiganya memakai grant per kolom.

grant select (playstyle) on public.lobby to anon, authenticated;

-- Pemeriksaan: melempar exception kalau masih ada kolom lobi yang tidak bisa
-- dibaca `anon`, selain discord_url yang memang sengaja ditutup.
do $verify$
declare
  ungranted text;
begin
  select string_agg(c.column_name, ', ')
  into ungranted
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'lobby'
    and c.column_name <> 'discord_url'
    and not has_column_privilege('anon', 'public.lobby', c.column_name, 'SELECT');

  if ungranted is not null then
    raise exception 'Kolom lobi tanpa hak baca: %', ungranted;
  end if;

  raise notice 'Pemeriksaan lolos: semua kolom lobi terbaca kecuali discord_url.';
end
$verify$;
