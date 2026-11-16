-- Tag personalitas sebagai tabel, menggantikan `profiles.personality_tags`.
--
-- Fase 1 §6.1 bagian pertama. Rencana: docs/proposal-revision-2026-10.md
--
-- ── Kenapa dipecah jadi tabel ───────────────────────────────────────────
-- Revisi proposal menolak penyimpanan beberapa tag dalam satu kolom dengan
-- alasan bentuk normal pertama (1NF): "Penyimpanan tag pada tabel tersendiri
-- menggantikan penyimpanan beberapa tag dalam satu kolom teks yang dipisahkan
-- koma, sehingga setiap kolom hanya berisi satu nilai."
--
-- Alasan praktisnya lebih kuat lagi: Persamaan 3.13 menghitung kekuatan tag
-- dari jumlah PENILAI BERBEDA yang memberi tag itu. Itu tidak bisa dihitung
-- dari sebuah array di baris pengguna — butuh baris per (penilai, tag).
--
-- ── Yang TIDAK dibuat di sini ───────────────────────────────────────────
--   * `review_tag` — merujuk `reviews` yang belum ada. Menyusul bersama
--     tabel reviews dan perhitungan Bayesian.
--   * `lobby_tag` (himpunan B) — belum ada yang bisa menulisinya. Semua
--     penulisan data lobi harus lewat fungsi database, dan create_lobby /
--     update_lobby baru ditulis ulang di bagian ketiga. Membuat tabel yang
--     tidak bisa diisi siapa pun hanya jadi beban.
--
-- ── Catatan penting untuk yang melanjutkan ──────────────────────────────
-- `lobby.tags` yang sudah ada BUKAN himpunan B. Itu "vibe tag" dari form
-- buat lobi dengan kosakata sendiri (Competitive, Tactical, Grinding, Voice
-- Comms, Chill) yang hanya beririsan satu nilai dengan tag personalitas.
-- Jangan digabungkan: `lobby_tag` nanti adalah tabel terpisah.
--
-- `profiles.personality_tags` sengaja BELUM dihapus. Kolomnya masih dibaca
-- di banyak layar; isinya disalin ke sini dulu, kode dipindahkan, baru
-- kolomnya dibuang di migrasi terpisah setelah terbukti aman.

-- ── 1. Tabel induk tag ──────────────────────────────────────────────────
create table public.tag (
  id smallint primary key generated always as identity,
  name text not null unique,
  -- Urutan tampil di form; bukan peringkat kepentingan.
  sort_order smallint not null
);

-- Kelimanya sama persis dengan daftar yang selama ini dibatasi oleh check
-- constraint `profiles.personality_tags`, supaya penyalinan di langkah 4
-- tidak ada yang tercecer.
insert into public.tag (name, sort_order) values
  ('Shot Caller', 1),
  ('Positive Mental Attitude', 2),
  ('Chill', 3),
  ('Never Surrender', 4),
  ('Flex Player', 5);

-- ── 2. Tag pilihan pengguna sendiri (p_t pada Persamaan 3.13) ───────────
create table public.user_tag (
  user_id uuid not null references public.profiles (id) on delete cascade,
  tag_id smallint not null references public.tag (id),
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);

create index user_tag_tag_idx on public.user_tag (tag_id);

-- ── 3. Batas jumlah tag ─────────────────────────────────────────────────
-- Revisi menetapkan 3 sampai 5 tag saat membuat akun. Hanya batas ATAS yang
-- ditegakkan di sini: batas bawah tidak bisa diperiksa per baris (baris
-- pertama dari tiga selalu terlihat seperti pelanggaran), dan sebagian akun
-- yang sudah ada memiliki nol atau dua tag. Minimum 3 ditegakkan di form,
-- sama seperti aturan umur yang juga hanya berlaku untuk data baru.
create function public.limit_user_tags()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.user_tag where user_id = new.user_id) > 5 then
    raise exception 'too_many_tags'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create trigger user_tag_limit
  after insert on public.user_tag
  for each row execute function public.limit_user_tags();

-- ── 4. Salin isi profiles.personality_tags ──────────────────────────────
insert into public.user_tag (user_id, tag_id)
select p.id, t.id
from public.profiles p
cross join lateral unnest(p.personality_tags) as picked(name)
join public.tag t on t.name = picked.name
on conflict do nothing;

-- ── 5. Hak akses ────────────────────────────────────────────────────────
-- Tag bersifat publik: tag seorang pemain memang untuk dilihat pemain lain
-- sebelum mengundang. Yang dibatasi hanya siapa yang boleh mengubahnya.
alter table public.tag enable row level security;
alter table public.user_tag enable row level security;

create policy tag_read
  on public.tag for select to anon, authenticated using (true);

create policy user_tag_read
  on public.user_tag for select to anon, authenticated using (true);

create policy user_tag_insert_own
  on public.user_tag for insert to authenticated
  with check (auth.uid() = user_id);

create policy user_tag_delete_own
  on public.user_tag for delete to authenticated
  using (auth.uid() = user_id);

-- Tidak ada kebijakan update: ini tabel penghubung, tag ditambah atau
-- dihapus, tidak pernah diubah.

grant select on public.tag to anon, authenticated;
grant select on public.user_tag to anon, authenticated;
grant insert (user_id, tag_id), delete on public.user_tag to authenticated;

revoke all on function public.limit_user_tags() from public, anon, authenticated;

-- ── 6. Periksa sendiri ──────────────────────────────────────────────────
do $verify$
declare
  n_tag      int;
  n_salinan  int;
  n_asli     int;
  tercecer   text;
begin
  select count(*) into n_tag from public.tag;
  if n_tag <> 5 then
    raise exception 'Tabel tag harusnya 5 baris, dapat %', n_tag;
  end if;

  -- Setiap tag yang ada di kolom lama harus punya pasangan di tabel baru.
  select count(*) into n_asli
  from public.profiles p, unnest(p.personality_tags) as x(name);

  select count(*) into n_salinan from public.user_tag;

  if n_salinan <> n_asli then
    select string_agg(distinct x.name, ', ') into tercecer
    from public.profiles p, unnest(p.personality_tags) as x(name)
    where not exists (select 1 from public.tag t where t.name = x.name);

    raise exception 'Penyalinan tidak lengkap: % dari % baris. Nama tak dikenal: %',
      n_salinan, n_asli, coalesce(tercecer, '(tidak ada)');
  end if;

  raise notice 'Pemeriksaan lolos: 5 tag, % baris user_tag tersalin.', n_salinan;
end
$verify$;
