-- Preferensi lobi untuk rumus rekomendasi: tabel `lobby_tag` (himpunan B pada
-- Persamaan 3.14) dan pengisian kolom `lobby.playstyle` (Pb pada Persamaan 3.2).
--
-- Fase 1 §6.1 bagian keempat.
--
-- ── Kenapa fungsi baru, bukan menambah parameter ────────────────────────
-- Cara "benar" menurut rencana awal adalah menambahkan p_playstyle dan
-- p_tag_ids ke create_lobby dan update_lobby. Keduanya berjumlah 239 baris dan
-- mengubah signature berarti men-`drop` lalu menulis ulang keduanya utuh.
--
-- Itu berarti menyalin ulang 239 baris SQL tanpa pernah bisa dijalankan lebih
-- dulu — migrasi di proyek ini diterapkan manual di SQL editor. Satu salah
-- ketik merusak pembuatan lobi di database yang sudah dipakai.
--
-- `set_lobby_preferences` bersifat aditif: tidak bisa merusak apa pun yang
-- sudah berjalan, dan kalau salah cukup diperbaiki tanpa menyentuh alur lobi.
-- Aturan repo tetap dipatuhi — penulisan data lobi tetap lewat fungsi
-- database, bukan insert langsung dari browser. Yang berubah hanya: satu
-- fungsi per urusan, bukan satu fungsi raksasa.
--
-- Konsekuensi untuk klien: form buat lobi memanggil create_lobby lalu
-- set_lobby_preferences. Kalau panggilan kedua gagal, lobinya tetap ada tanpa
-- preferensi — dan itu keadaan yang sah, karena |B| = 0 sudah ditangani
-- Persamaan 3.15 dan playstyle boleh null.
--
-- ── Catatan untuk yang melanjutkan ──────────────────────────────────────
-- `lobby.tags` yang sudah ada BUKAN himpunan B. Itu "vibe tag" dari form buat
-- lobi (Competitive, Tactical, Grinding, Voice Comms, Chill) dengan kosakata
-- sendiri. `lobby_tag` ini yang masuk Persamaan 3.14. Jangan digabungkan.

-- ── 1. Tabel ────────────────────────────────────────────────────────────
create table public.lobby_tag (
  lobby_id uuid not null references public.lobby (id) on delete cascade,
  tag_id smallint not null references public.tag (id),
  primary key (lobby_id, tag_id)
);

create index lobby_tag_tag_idx on public.lobby_tag (tag_id);

-- Maksimal 3, sesuai revisi: |B| adalah penyebut pada Persamaan 3.14, jadi
-- makin banyak tag makin sulit pelamar mendapat nilai tinggi. Ditunda sampai
-- commit supaya pola "hapus semua lalu masukkan yang baru" tetap jalan.
create function public.check_lobby_tag_count()
returns trigger
language plpgsql
as $$
declare
  v_lobby uuid := coalesce(new.lobby_id, old.lobby_id);
begin
  if (select count(*) from public.lobby_tag where lobby_id = v_lobby) > 3 then
    raise exception 'too_many_lobby_tags'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger lobby_tag_count
  after insert on public.lobby_tag
  deferrable initially deferred
  for each row execute function public.check_lobby_tag_count();

-- ── 2. Penulisnya ───────────────────────────────────────────────────────
create function public.set_lobby_preferences(
  p_lobby uuid,
  p_playstyle smallint default null,
  p_tag_ids smallint[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_leader uuid;
  v_tag smallint;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  select status, leader_id into v_status, v_leader
  from public.lobby
  where id = p_lobby;

  if v_leader is null then
    raise exception 'lobby_not_found';
  end if;

  -- Cerminan aturan update_lobby: hanya pembuat lobi, dan hanya selama lobi
  -- belum berakhir.
  if v_leader <> v_uid then
    raise exception 'not_leader';
  end if;

  if v_status in ('completed', 'cancelled') then
    raise exception 'lobby_closed';
  end if;

  if p_playstyle is not null and (p_playstyle < 1 or p_playstyle > 5) then
    raise exception 'playstyle_invalid';
  end if;

  update public.lobby set playstyle = p_playstyle where id = p_lobby;

  -- Ganti seluruh himpunan, bukan selisihnya: paling banyak tiga baris, dan
  -- triggernya ditunda sampai commit sehingga keadaan antara tidak masalah.
  delete from public.lobby_tag where lobby_id = p_lobby;

  if p_tag_ids is not null then
    if array_length(p_tag_ids, 1) > 3 then
      raise exception 'too_many_lobby_tags';
    end if;
    foreach v_tag in array p_tag_ids loop
      insert into public.lobby_tag (lobby_id, tag_id)
      values (p_lobby, v_tag)
      on conflict do nothing;
    end loop;
  end if;
end;
$$;

-- ── 3. Hak akses ────────────────────────────────────────────────────────
alter table public.lobby_tag enable row level security;

-- Dibaca siapa saja: pelamar perlu tahu tag apa yang dicari lobi sebelum
-- melamar, dan kartu lobi menampilkannya.
create policy lobby_tag_read
  on public.lobby_tag for select to anon, authenticated using (true);

-- Tanpa kebijakan tulis: seperti data lobi lainnya, hanya lewat fungsi.
grant select on public.lobby_tag to anon, authenticated;

revoke all on function public.check_lobby_tag_count() from public, anon, authenticated;
revoke all on function public.set_lobby_preferences(uuid, smallint, smallint[])
  from public, anon;
grant execute on function public.set_lobby_preferences(uuid, smallint, smallint[])
  to authenticated;

-- ── 4. Periksa sendiri ──────────────────────────────────────────────────
do $verify$
declare
  v_lobby uuid;
begin
  if to_regclass('public.lobby_tag') is null then
    raise exception 'Tabel lobby_tag tidak terbentuk';
  end if;

  -- Batas tiga tag harus benar-benar menolak yang keempat.
  select id into v_lobby from public.lobby limit 1;
  if v_lobby is not null then
    begin
      insert into public.lobby_tag (lobby_id, tag_id)
      select v_lobby, id from public.tag order by id limit 4;
      set constraints public.lobby_tag_count immediate;
      raise exception 'Batas 3 tag lobi tidak aktif — 4 tag diterima';
    exception when check_violation then
      null;  -- inilah yang diharapkan
    end;
    delete from public.lobby_tag where lobby_id = v_lobby;
  end if;

  raise notice 'Pemeriksaan lolos: lobby_tag siap, tag keempat ditolak.';
end
$verify$;
