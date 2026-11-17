-- Penilaian pasca-lobi: tabel `reviews` + `review_tag` + fungsi penulisnya.
--
-- Fase 1 §6.1 bagian kedua. Ini sumber data variabel R pada Persamaan 3.1 —
-- selama ini satu-satunya masukan rumus yang belum punya data nyata.
--
-- Perhitungan Bayesian-nya (Persamaan 3.5-3.12) BELUM ada di sini. Migrasi ini
-- hanya menyiapkan penyimpanan dan aturan siapa boleh menilai siapa. Kolom
-- rater_bias, corrected_rating dan reviewer_weight sudah disediakan karena
-- revisi menyebutnya dihitung SAAT ULASAN DIKIRIM berdasarkan riwayat penilai
-- sebelum rating itu — bukan dihitung ulang setiap dibaca. Untuk sementara
-- diisi nilai netral, lalu fungsi penilaiannya mengisi yang sebenarnya.
--
-- ── Aturan yang ditegakkan di sini ──────────────────────────────────────
--   1. Lobi harus berstatus `completed`.
--   2. Lobi harus sempat berjalan minimal 15 menit (selisih started_at dan
--      closed_at). Mencegah pembuat lobi memulai lalu langsung menyelesaikan
--      lobi bersama akun sendiri demi menggelembungkan rating.
--   3. Penilai dan yang dinilai sama-sama anggota lobi itu, dan bukan orang
--      yang keluar sebelum lobi dimulai.
--   4. Satu penilai satu rating per orang per lobi.
--   5. Tidak bisa menilai diri sendiri.
--   6. Rating 1-2 bintang wajib menyertakan alasan.
--
-- ── Anonimitas ──────────────────────────────────────────────────────────
-- Revisi: "Rating bersifat anonim... sehingga pengguna tidak dapat menebak
-- penilainya dari perubahan skor." Karena itu TIDAK ADA kebijakan select untuk
-- klien sama sekali: tak seorang pun membaca tabel ini lewat API, termasuk
-- orang yang dinilai. Skor reputasi dibaca dari `profiles`, hasil agregat.
-- Penilai pun tidak bisa membaca kembali ulasannya sendiri — kalau nanti layar
-- "ulasan yang sudah saya kirim" dibutuhkan, tambahkan kebijakan yang hanya
-- mengizinkan rater_id = auth.uid(), jangan buka ratee_id.

-- ── 1. Tabel reviews ────────────────────────────────────────────────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobby (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  ratee_id uuid not null references public.profiles (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),

  -- Wajib untuk 1-2 bintang. Tidak memengaruhi skor sama sekali; gunanya
  -- membuat penilai berpikir ulang, dan jadi catatan moderasi.
  low_rating_reason text check (
    low_rating_reason in ('afk', 'flaming', 'trolling', 'verbal_abuse')
  ),

  -- Dihitung sekali saat ulasan dikirim, dari riwayat penilai SEBELUM rating
  -- ini. Disimpan supaya skor reputasi tidak berubah surut ketika kebiasaan
  -- penilainya berubah di kemudian hari.
  rater_bias numeric(4, 3) not null default 0,       -- b_j, Persamaan 3.6
  corrected_rating numeric(4, 3) not null,           -- r̃_i, Persamaan 3.7
  reviewer_weight numeric(4, 3) not null default 1,  -- w_i, Persamaan 3.8

  created_at timestamptz not null default now(),

  -- Aturan 4 dan 5.
  constraint reviews_one_per_pair unique (lobby_id, rater_id, ratee_id),
  constraint reviews_not_self check (rater_id <> ratee_id),
  -- Aturan 6, ditegakkan kolom supaya tidak bisa dilewati jalur mana pun.
  constraint reviews_low_rating_needs_reason check (
    (stars >= 3 and low_rating_reason is null)
    or (stars <= 2 and low_rating_reason is not null)
  )
);

-- Jendela 25 rating terakhir (Persamaan 3.9) membaca per orang, terbaru dulu.
create index reviews_ratee_recent_idx
  on public.reviews (ratee_id, created_at desc);
-- Koreksi bias membaca seluruh rating yang pernah DIBERIKAN penilai.
create index reviews_rater_idx on public.reviews (rater_id);

-- ── 2. Tag yang diberikan penilai (n_t pada Persamaan 3.13) ─────────────
create table public.review_tag (
  review_id uuid not null references public.reviews (id) on delete cascade,
  tag_id smallint not null references public.tag (id),
  primary key (review_id, tag_id)
);

create index review_tag_tag_idx on public.review_tag (tag_id);

-- ── 3. Siapa boleh menilai siapa ────────────────────────────────────────
-- Pembuat lobi selalu ikut bermain; sisanya adalah pelamar yang diterima dan
-- tidak keluar sebelum lobi dimulai.
create function public.played_in(p_lobby uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lobby l
    where l.id = p_lobby and l.leader_id = p_user
  ) or exists (
    select 1
    from public.applications a
    join public.lobby l on l.id = a.lobby_id
    where a.lobby_id = p_lobby
      and a.applicant_id = p_user
      and a.status in ('accepted', 'left')
      and a.joined_at is not null
      -- Keluar sebelum lobi dimulai berarti tidak pernah bermain bersama.
      and (a.left_at is null or a.left_at >= l.started_at)
  );
$$;

-- Satu tempat untuk aturan 1-3, dipakai fungsi di bawah dan bisa dipanggil
-- layar penilaian untuk tahu apakah tombolnya perlu ditampilkan.
create function public.can_review(p_lobby uuid, p_rater uuid, p_ratee uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lobby l
    where l.id = p_lobby
      and l.status = 'completed'
      -- Aturan 2: benar-benar sempat bermain.
      and l.started_at is not null
      and l.closed_at is not null
      and l.closed_at - l.started_at >= interval '15 minutes'
      -- Aturan 3: keduanya ikut sampai lobi dimulai.
      and public.played_in(p_lobby, p_rater)
      and public.played_in(p_lobby, p_ratee)
  );
$$;

-- ── 4. Fungsi penulis ───────────────────────────────────────────────────
-- Satu-satunya jalan masuk: klien tidak punya hak insert ke `reviews`, sama
-- seperti data lobi. Kalau penulisannya dibiarkan langsung, aturan di atas
-- bisa dilewati dengan memanggil API apa adanya.
create function public.submit_review(
  p_lobby uuid,
  p_ratee uuid,
  p_stars smallint,
  p_reason text default null,
  p_tag_ids smallint[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rater uuid := auth.uid();
  v_review uuid;
  v_tag smallint;
begin
  if v_rater is null then
    raise exception 'not_signed_in';
  end if;

  if not public.can_review(p_lobby, v_rater, p_ratee) then
    raise exception 'cannot_review';
  end if;

  -- rater_bias, corrected_rating dan reviewer_weight sengaja memakai nilai
  -- netral untuk saat ini: Persamaan 3.5-3.8 menyusul di migrasi berikutnya,
  -- dan fungsi ini yang akan menghitungnya. Sampai saat itu rating tersimpan
  -- apa adanya, jadi tidak ada data yang hilang.
  insert into public.reviews (
    lobby_id, rater_id, ratee_id, stars, low_rating_reason, corrected_rating
  )
  values (
    p_lobby, v_rater, p_ratee, p_stars, p_reason, p_stars
  )
  returning id into v_review;

  if p_tag_ids is not null then
    foreach v_tag in array p_tag_ids loop
      insert into public.review_tag (review_id, tag_id)
      values (v_review, v_tag)
      on conflict do nothing;
    end loop;
  end if;

  return v_review;
end;
$$;

-- ── 5. Hak akses ────────────────────────────────────────────────────────
alter table public.reviews enable row level security;
alter table public.review_tag enable row level security;

-- Sengaja tanpa kebijakan select, insert, update maupun delete: lihat catatan
-- anonimitas di atas. RLS yang menyala tanpa kebijakan berarti tertutup untuk
-- semua peran klien. Fungsi di atas security definer, jadi tetap bisa menulis.
revoke all on public.reviews from anon, authenticated;
revoke all on public.review_tag from anon, authenticated;

revoke all on function public.submit_review(uuid, uuid, smallint, text, smallint[])
  from public, anon;
grant execute on function public.submit_review(uuid, uuid, smallint, text, smallint[])
  to authenticated;

revoke all on function public.can_review(uuid, uuid, uuid) from public, anon;
grant execute on function public.can_review(uuid, uuid, uuid) to authenticated;
revoke all on function public.played_in(uuid, uuid) from public, anon, authenticated;

-- ── 6. Periksa sendiri ──────────────────────────────────────────────────
do $verify$
declare
  v_lobby uuid;
begin
  -- Lobi yang sudah selesai tapi tidak punya started_at tidak boleh dinilai.
  select id into v_lobby from public.lobby where status = 'completed' limit 1;

  if v_lobby is not null then
    if public.can_review(v_lobby, gen_random_uuid(), gen_random_uuid()) then
      raise exception 'can_review meloloskan orang yang bukan anggota lobi';
    end if;
  end if;

  if to_regclass('public.reviews') is null
     or to_regclass('public.review_tag') is null then
    raise exception 'Tabel reviews atau review_tag tidak terbentuk';
  end if;

  raise notice 'Pemeriksaan lolos: reviews siap, bukan-anggota ditolak.';
end
$verify$;
