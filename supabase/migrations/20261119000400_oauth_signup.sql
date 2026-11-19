-- Masuk lewat Google dan Discord: username yang tidak diketik siapa pun.
--
-- `handle_new_user` (20260919000000_profiles.sql) membaca
-- `raw_user_meta_data.username` -- dan hanya form pendaftaran email yang
-- menuliskannya -- lalu jatuh ke bagian depan alamat email. Keduanya patah
-- pada pendaftaran OAuth, dengan tiga cara:
--
--   1. Tidak ada yang memeriksa hasilnya terhadap `profiles_username_lower_idx`
--      (unik pada lower(username)). Akun Google yang bagian depan emailnya
--      sudah dipakai orang lain membuat INSERT gagal; kegagalan itu
--      menggagalkan seluruh insert ke `auth.users`, dan Supabase melaporkannya
--      ke peramban sebagai "Database error saving new user". Artinya tombolnya
--      sekadar tidak bekerja. Pada pendaftaran email hal ini memang disengaja
--      (`SignupForm` menerjemahkannya menjadi "That username is already
--      taken"), tetapi pada OAuth tidak ada nama yang bisa diperbaiki pemakai.
--   2. Akun Discord tanpa email terverifikasi datang dengan `email` null;
--      `split_part(null, '@', 1)` juga null, sementara `profiles.username`
--      NOT NULL. Pendaftarannya gagal total.
--   3. Username muncul di URL (`/profile/<username>`), jadi hanya boleh berisi
--      [A-Za-z0-9_.-] (src/lib/username.ts). Nama tampilan Google
--      ("Ryon Pratama") atau nama beraksara non-Latin tidak memenuhinya.
--
-- Aturan di bawah TIDAK menyentuh kasus eksplisit: kalau pemakai mengetik
-- username sendiri, nama itu dimasukkan apa adanya dan duplikatnya tetap
-- ditolak, sehingga pesan "username already taken" di form email tetap jalan
-- seperti sebelumnya. Nama hanya dibuatkan ketika tidak ada yang memilihnya.

-- == Pembuat nama =========================================================
-- Dipisah dari trigger supaya bisa diuji sendiri (lihat blok pemeriksaan di
-- bawah, dan BAB 4: boundary value -- 2 karakter, 3 karakter, 24, 25).
--
-- EXECUTE-nya dicabut dari semua peran: trigger-nya security definer milik
-- postgres, jadi ia tetap boleh memanggil, sedangkan PostgREST tidak
-- mengekspos fungsi ini sebagai RPC.
create or replace function public.generate_username(
  p_handle text,
  p_email  text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_try    text;
  v_base   text := '';
  v_name   text;
  v_suffix int  := 0;
begin
  -- Bersihkan setiap calon sampai tersisa yang boleh ada di URL, lalu pakai
  -- yang pertama yang masih punya 3 karakter. Nama beraksara non-Latin
  -- bersih menjadi kosong -- itu sebabnya ada cadangan di akhir.
  foreach v_try in array array[p_handle, split_part(coalesce(p_email, ''), '@', 1)]::text[]
  loop
    v_base := left(regexp_replace(coalesce(v_try, ''), '[^A-Za-z0-9_.-]', '', 'g'), 24);
    exit when length(v_base) >= 3;
  end loop;

  if coalesce(length(v_base), 0) < 3 then
    v_base := 'player';
  end if;

  -- Nama buatan masih bisa bentrok: dua alamat Gmail dengan bagian depan sama
  -- di domain berbeda, atau nama yang sudah didaftarkan lewat email. Karena
  -- tidak ada yang memilih nama ini, menyelesaikannya diam-diam justru benar --
  -- menggagalkannya berarti tombol OAuth-nya tidak bisa dipakai sama sekali.
  v_name := v_base;
  while exists (
    select 1 from public.profiles where lower(username) = lower(v_name)
  ) loop
    v_suffix := v_suffix + 1;
    if v_suffix <= 50 then
      -- Tetap di dalam batas 24 karakter yang dipaksakan form.
      v_name := left(v_base, 24 - length(v_suffix::text)) || v_suffix::text;
    else
      -- Lima puluh tebakan gagal: ambil yang hampir pasti belum ada. Kondisi
      -- WHILE tetap memeriksanya, jadi loop ini pasti berhenti.
      v_name := left(v_base, 14) || '-' || to_hex((random() * 2147483647)::int);
    end if;
  end loop;

  return v_name;
end;
$$;

revoke all on function public.generate_username(text, text) from public;

-- == Trigger ==============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  v_chosen   text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  v_handle   text;
  v_base     text;
begin
  -- Pendaftaran email: pemakai mengetiknya sendiri. Masukkan apa adanya
  -- supaya duplikat tetap melempar galat -- itulah yang diubah SignupForm
  -- menjadi "That username is already taken". Jangan pernah mengganti nama
  -- pilihan orang secara diam-diam.
  if v_chosen is not null then
    insert into public.profiles (id, username) values (new.id, v_chosen);
    return new;
  end if;

  -- OAuth. Pada Discord, `name`/`user_name` MEMANG handel publik pemainnya,
  -- jadi itu username terbaik yang bisa kita dapat. Pada Google, `name`
  -- adalah nama asli orangnya, jadi sengaja dilewati dan dipakai bagian depan
  -- emailnya: username itu publik dan muncul di URL, sedangkan nama asli
  -- bukan sesuatu yang kita berhak sebarkan atas nama pemakainya.
  if v_provider = 'discord' then
    v_handle := coalesce(
      new.raw_user_meta_data ->> 'user_name',
      new.raw_user_meta_data ->> 'nickname',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data -> 'custom_claims' ->> 'global_name'
    );
  end if;

  v_base := public.generate_username(v_handle, new.email);

  begin
    insert into public.profiles (id, username) values (new.id, v_base);
  exception when unique_violation then
    -- Dua pendaftaran OAuth yang jatuh ke nama sama pada saat yang sama.
    -- Sempit sekali, tapi akibatnya pendaftaran gagal total, jadi dicoba
    -- sekali lagi dengan akhiran acak.
    insert into public.profiles (id, username)
    values (
      new.id,
      left(v_base, 14) || '-' || to_hex((random() * 2147483647)::int)
    );
  end;

  return new;
end;
$$;

-- Foto profil dari Google/Discord TIDAK diambil. `profiles.avatar_path`
-- dikunci CHECK ke `<id pemakai>/<waktu>.jpg` di bucket `avatars`
-- (20261004000000_avatars.sql) justru supaya tidak ada URL luar di sana.
-- Akun baru tampil sebagai inisial (`UserAvatar`) sampai pemakainya
-- mengunggah foto sendiri.

-- == Periksa sendiri ======================================================
do $verify$
declare
  v_ada   text;
  v_hasil text;
begin
  -- Fungsi ini MENGHINDARI nama yang sudah dipakai, jadi uji kesamaan persis
  -- hanya sahih kalau nama ujinya belum ada. Semua nama uji di bawah diawali
  -- "ujioauth"; itu dipastikan dulu, supaya migrasinya tidak pernah gagal
  -- gara-gara kebetulan ada yang mendaftar dengan nama itu.
  if exists (
    select 1 from public.profiles where lower(username) like 'ujioauth%'
  ) then
    raise exception 'Ada username berawalan "ujioauth"; ganti nama uji di migrasi ini.';
  end if;

  -- Handel Discord dipakai apa adanya.
  v_hasil := public.generate_username('UjiOauth', 'apa@saja.test');
  if v_hasil <> 'UjiOauth' then
    raise exception 'Handel bersih seharusnya dipakai apa adanya, dapat %', v_hasil;
  end if;

  -- Tanpa handel (Google): bagian depan email.
  v_hasil := public.generate_username(null, 'ujioauthmail@gmail.test');
  if v_hasil <> 'ujioauthmail' then
    raise exception 'Bagian depan email tidak terpakai, dapat %', v_hasil;
  end if;

  -- Spasi dan karakter lain dibuang, bukan ditolak.
  v_hasil := public.generate_username('Uji Oauth!', 'x@y.test');
  if v_hasil <> 'UjiOauth' then
    raise exception 'Pembersihan karakter salah, dapat %', v_hasil;
  end if;

  -- Handel yang bersih menjadi kosong harus jatuh ke email. Ini kasus nyata
  -- untuk nama beraksara non-Latin; diuji dengan '!!!' supaya berkasnya tetap
  -- ASCII dan aman ditempel di editor SQL mana pun.
  v_hasil := public.generate_username('!!!', 'ujioauthlatin@x.test');
  if v_hasil <> 'ujioauthlatin' then
    raise exception 'Handel tak terpakai tidak jatuh ke email, dapat %', v_hasil;
  end if;

  -- Boundary value: 2 karakter terlalu pendek, 3 karakter cukup. Uji yang
  -- kedua sengaja dibandingkan dengan email-nya, bukan dengan 'abc' --
  -- 'abc' bisa saja sudah dipakai orang, dan hasilnya 'abc1' tetap
  -- membuktikan handel-nya yang dipakai.
  v_hasil := public.generate_username('ab', 'ujioauthshort@x.test');
  if v_hasil <> 'ujioauthshort' then
    raise exception '2 karakter seharusnya ditolak, dapat %', v_hasil;
  end if;
  v_hasil := public.generate_username('abc', 'ujioauthshort@x.test');
  if v_hasil = 'ujioauthshort' then
    raise exception '3 karakter seharusnya diterima, tapi malah jatuh ke email';
  end if;

  -- Boundary value: lebih dari 24 karakter dipangkas ke 24. Kebal bentrok --
  -- penyelesaian bentrok pun menjaga panjangnya tetap 24.
  v_hasil := public.generate_username(repeat('a', 30), 'x@y.test');
  if length(v_hasil) <> 24 then
    raise exception 'Nama panjang seharusnya dipangkas ke 24, dapat % (%)',
      length(v_hasil), v_hasil;
  end if;

  -- Tidak ada handel dan tidak ada email sama sekali (Discord tanpa email
  -- terverifikasi) -- kasus yang sebelumnya menggagalkan pendaftaran.
  v_hasil := public.generate_username(null, null);
  if v_hasil not like 'player%' then
    raise exception 'Tanpa handel dan email seharusnya berawalan "player", dapat %', v_hasil;
  end if;

  -- Bentrok dengan nama yang sudah ada diselesaikan, bukan digagalkan.
  select username into v_ada from public.profiles limit 1;
  if v_ada is not null then
    v_hasil := public.generate_username(v_ada, 'x@y.test');
    if lower(v_hasil) = lower(v_ada) then
      raise exception 'Bentrok username tidak diselesaikan: % tetap %', v_ada, v_hasil;
    end if;
    if length(v_hasil) > 24 then
      raise exception 'Penyelesaian bentrok melewati 24 karakter: %', v_hasil;
    end if;
    raise notice 'Bentrok "%" diselesaikan menjadi "%".', v_ada, v_hasil;
  else
    raise notice 'Lewati uji bentrok: tabel profiles masih kosong.';
  end if;

  raise notice 'Pemeriksaan lolos: generate_username siap untuk Google dan Discord.';
end
$verify$;
