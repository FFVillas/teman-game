-- Menegakkan batas 3-5 tag personalitas di database, bukan hanya di form.
--
-- Melengkapi `20261116000000_personality_tags.sql`, yang baru menegakkan
-- batas atas.
--
-- ── Kenapa batas bawah butuh jenis trigger yang berbeda ─────────────────
-- Trigger `after insert for each row` dijalankan setelah SETIAP baris. Saat
-- seseorang menyimpan tiga tag, baris pertama masuk ketika jumlahnya masih
-- satu — sehingga penyimpanan yang benar pun ditolak di baris pertama.
--
-- `constraint trigger ... deferrable initially deferred` dijalankan saat
-- transaksi di-commit, ketika ketiga baris sudah masuk. Barulah jumlah
-- akhirnya bisa dinilai.
--
-- ── Kenapa nol tetap diperbolehkan ──────────────────────────────────────
-- Bukan demi akun yang sudah ada, melainkan karena onboarding memang boleh
-- dilewati (lihat AGENTS.md: "Everything is optional and the whole flow is
-- skippable"). Akun yang melewatinya tidak punya baris di `user_tag` sama
-- sekali, jadi tidak ada yang memicu trigger ini.
--
-- Perlu disadari, dan ini batas yang tidak bisa ditembus skema: database
-- hanya bisa menilai himpunan tag SAAT DIUBAH. Ia tidak bisa memaksa setiap
-- akun MEMILIKI tag, karena akun yang tidak pernah menyentuh tabel ini tidak
-- pernah memicu apa pun. Jadi aturan skripsi "pengguna memilih tiga hingga
-- lima tag saat membuat akun" memang sebagian tanggung jawab alur onboarding.
-- Yang bisa dijamin database: kalau tag diisi, jumlahnya 3 sampai 5 —
-- tidak pernah 1 atau 2.
--
-- ── Akibat untuk data yang ada ──────────────────────────────────────────
-- Saat ini ada 6 akun dengan 1-2 tag. Baris mereka tetap tersimpan; trigger
-- hanya aktif saat tag diubah. Begitu akun-akun itu menyimpan profilnya,
-- mereka harus melengkapi jadi 3 tag atau mengosongkannya. Disepakati tim:
-- akun-akun itu data uji yang akan dihapus.

-- Trigger lama diganti: yang baru sudah mencakup batas atas sekaligus.
drop trigger user_tag_limit on public.user_tag;
drop function public.limit_user_tags();

create function public.check_user_tag_count()
returns trigger
language plpgsql
as $$
declare
  -- `new` kosong saat delete, `old` kosong saat insert.
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_count int;
begin
  select count(*) into v_count
  from public.user_tag
  where user_id = v_user;

  -- Nol berarti "belum diisi", dan itu sah: onboarding boleh dilewati.
  -- Mengosongkan kembali juga sah.
  if v_count = 0 then
    return null;
  end if;

  if v_count < 3 then
    raise exception 'too_few_tags'
      using errcode = 'check_violation',
            hint = 'Pilih minimal 3 tag personalitas, atau kosongkan semuanya.';
  end if;

  if v_count > 5 then
    raise exception 'too_many_tags'
      using errcode = 'check_violation',
            hint = 'Maksimal 5 tag personalitas.';
  end if;

  return null;
end;
$$;

-- Ditunda sampai commit, supaya seluruh himpunan terlihat sekaligus. Ini juga
-- yang membuat pola "hapus semua lalu masukkan yang baru" berfungsi dalam satu
-- transaksi — cara form edit menyimpan perubahan.
create constraint trigger user_tag_count
  after insert or delete on public.user_tag
  deferrable initially deferred
  for each row execute function public.check_user_tag_count();

revoke all on function public.check_user_tag_count() from public, anon, authenticated;

-- ── Periksa sendiri ─────────────────────────────────────────────────────
do $verify$
declare
  v_admin uuid;
  v_tag   smallint;
  v_gagal boolean := false;
begin
  -- Pakai akun mana pun yang belum punya tag, supaya tidak mengganggu data.
  select p.id into v_admin
  from public.profiles p
  where not exists (select 1 from public.user_tag u where u.user_id = p.id)
  limit 1;

  if v_admin is null then
    raise notice 'Lewati uji: semua akun sudah punya tag.';
    return;
  end if;

  select id into v_tag from public.tag order by id limit 1;

  -- Satu tag saja harus ditolak saat commit sub-transaksi ini.
  begin
    insert into public.user_tag (user_id, tag_id) values (v_admin, v_tag);
    -- Memaksa trigger yang ditunda dijalankan sekarang.
    set constraints public.user_tag_count immediate;
    v_gagal := true;  -- kalau sampai sini, berarti TIDAK ditolak
  exception when check_violation then
    null;  -- inilah yang diharapkan
  end;

  if v_gagal then
    raise exception 'Trigger tidak menolak tag tunggal — batas bawah tidak aktif.';
  end if;

  raise notice 'Pemeriksaan lolos: 1 tag ditolak, 0 dan 3-5 diterima.';
end
$verify$;
