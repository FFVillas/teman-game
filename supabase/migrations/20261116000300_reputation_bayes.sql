-- Perhitungan skor reputasi: Persamaan 3.5 sampai 3.12.
--
-- Fase 1 §6.1 bagian ketiga. Melengkapi `20261116000200_reviews.sql`, yang
-- baru menyimpan rating mentah.
--
-- Seluruhnya di sisi server. Revisi menyebutnya tegas: "Parameter pembobotan
-- (bj dan wi) serta skor R* dan R hanya diproses di sisi server untuk mencegah
-- pengguna memanipulasi sistem reputasi."
--
-- ── Nilai tetap ─────────────────────────────────────────────────────────
--   m = 3   nilai awal netral sebelum platform punya data
--   C = 5   kekuatan nilai awal (Persamaan 3.11, dikunci — lihat §3.3
--           docs/proposal-revision-2026-10.md: empirical Bayes tidak bisa
--           diestimasi dari ~30 responden UAT)
--   N = 25  jendela rating (Persamaan 3.9: (1.96 x 1 / 0.4)^2 dibulatkan)
--
-- ── Penundaan 48 jam ────────────────────────────────────────────────────
-- Revisi: "skor reputasi pada profil baru diperbarui setelah seluruh anggota
-- lobi memberikan penilaian atau batas waktu 48 jam berakhir. Dengan demikian,
-- pengguna tidak dapat menebak penilainya dari perubahan skor."
--
-- Diterapkan lewat kolom `effective_at`: sebuah ulasan baru ikut dihitung
-- setelah saat itu. Tidak ada penjadwal — `release_due_reviews()` dipanggil
-- dari jalur baca, pola yang sama dengan `expire_stale_lobbies`.

alter table public.reviews
  -- null berarti belum dirilis; diisi saat seluruh anggota selesai menilai
  -- atau saat tenggat 48 jam lewat.
  add column effective_at timestamptz;

create index reviews_pending_idx
  on public.reviews (lobby_id) where effective_at is null;

alter table public.profiles
  -- R* (Persamaan 3.10), skala bintang 1-5. Dipakai rumus rekomendasi.
  -- `reputation_score` yang sudah ada tetap jadi nilai tampilan profil
  -- (Persamaan 3.12), karena itu yang mudah dipahami pengguna.
  add column reputation_bayes numeric(4, 3) not null default 3;

comment on column public.profiles.reputation_bayes is
  'R* pada Persamaan 3.10. R = (R* - 1) / 4 dipakai pada Persamaan 3.1. '
  'Kolom reputation_score adalah rata-rata sederhana untuk ditampilkan.';

grant select (reputation_bayes) on public.profiles to anon, authenticated;

-- ── Persamaan 3.5 - 3.7: koreksi bias penilai ───────────────────────────
-- Rata-rata Bayesian dari rating yang pernah DIBERIKAN penilai, lalu
-- selisihnya terhadap m. Penilai yang baru memberi sedikit rating ditarik
-- mendekati m, sehingga koreksinya kecil — itu gunanya prior di sini.
create function public.rater_bias(p_rater uuid, p_before timestamptz)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select round(
    ((5 * 3) + coalesce(sum(r.stars), 0)) / (5 + count(*))::numeric - 3,
    3
  )
  from public.reviews r
  where r.rater_id = p_rater
    and r.created_at < p_before;
$$;

-- ── Persamaan 3.8: bobot rating ─────────────────────────────────────────
-- Satu penilai satu suara terhadap satu orang: kalau penilai yang sama menilai
-- orang yang sama beberapa kali di dalam jendela, pengaruhnya dibagi rata.
-- Tabel reviews sudah membatasi satu rating per lobi, jadi k_i > 1 hanya
-- terjadi lintas lobi.
create function public.review_weight(p_rater uuid, p_ratee uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select round(1 / greatest(count(*), 1)::numeric, 3)
  from (
    select 1
    from public.reviews r
    where r.ratee_id = p_ratee
      and r.rater_id = p_rater
      and r.effective_at is not null
    order by r.created_at desc
    limit 25
  ) dalam_jendela;
$$;

-- ── Persamaan 3.10 + 3.12: skor Bayesian dan nilai tampilan ─────────────
create function public.recompute_reputation(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bayes   numeric;
  v_display numeric;
  v_count   int;
begin
  -- Persamaan 3.9: hanya 25 rating terakhir yang sudah dirilis.
  with jendela as (
    select r.stars, r.corrected_rating, r.rater_id
    from public.reviews r
    where r.ratee_id = p_user
      and r.effective_at is not null
      and r.effective_at <= now()
    order by r.created_at desc
    limit 25
  ),
  berbobot as (
    select j.corrected_rating,
           public.review_weight(j.rater_id, p_user) as w
    from jendela j
  )
  select
    -- Persamaan 3.10
    round(((5 * 3) + coalesce(sum(b.w * b.corrected_rating), 0))
          / (5 + coalesce(sum(b.w), 0)), 3),
    -- Persamaan 3.12: rata-rata sederhana, inilah yang dilihat pengguna
    round(coalesce(avg(j.stars), 0), 2),
    count(*)
  into v_bayes, v_display, v_count
  from jendela j
  full join berbobot b on true;

  update public.profiles
  set reputation_bayes = coalesce(v_bayes, 3),
      reputation_score = coalesce(v_display, 0),
      review_count = coalesce(v_count, 0)
  where id = p_user;
end;
$$;

-- ── Pelepasan ulasan: semua sudah menilai, atau 48 jam lewat ────────────
-- Dipanggil dari jalur baca, seperti expire_stale_lobbies. Tanpa penjadwal.
create function public.release_due_reviews()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ratee uuid;
begin
  -- Sebuah lobi "selesai dinilai" kalau tidak ada lagi pasangan penilai-dinilai
  -- yang masih kosong. Pasangan yang mungkin dihitung dari lobby_member.
  with lobi_tertunda as (
    select distinct r.lobby_id
    from public.reviews r
    where r.effective_at is null
  ),
  siap as (
    select lt.lobby_id
    from lobi_tertunda lt
    join public.lobby l on l.id = lt.lobby_id
    where
      -- Tenggat 48 jam sejak lobi ditutup.
      l.closed_at + interval '48 hours' <= now()
      -- atau: jumlah ulasan sudah sebanyak pasangan yang mungkin,
      -- yaitu n anggota x (n - 1).
      or (
        select count(*) from public.reviews r2 where r2.lobby_id = lt.lobby_id
      ) >= (
        select count(*) * (count(*) - 1)
        from public.lobby_member m where m.lobby_id = lt.lobby_id
      )
  )
  update public.reviews r
  set effective_at = now()
  from siap s
  where r.lobby_id = s.lobby_id and r.effective_at is null;

  -- Hitung ulang hanya untuk orang yang skornya benar-benar berubah.
  for v_ratee in
    select distinct ratee_id
    from public.reviews
    where effective_at is not null
      and effective_at > now() - interval '1 minute'
  loop
    perform public.recompute_reputation(v_ratee);
  end loop;
end;
$$;

-- ── Isi bias dan bobot saat ulasan dikirim ──────────────────────────────
-- submit_review() sebelumnya menyimpan nilai netral. Sekarang menghitung
-- yang sebenarnya, dari riwayat penilai SEBELUM rating ini — supaya skor
-- yang sudah tersimpan tidak berubah surut saat kebiasaan penilainya berubah.
create or replace function public.submit_review(
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
  v_bias numeric;
  v_corrected numeric;
begin
  if v_rater is null then
    raise exception 'not_signed_in';
  end if;

  if not public.can_review(p_lobby, v_rater, p_ratee) then
    raise exception 'cannot_review';
  end if;

  -- Persamaan 3.6 lalu 3.7, dibatasi tetap di rentang 1-5.
  v_bias := public.rater_bias(v_rater, now());
  v_corrected := least(5, greatest(1, p_stars - v_bias));

  insert into public.reviews (
    lobby_id, rater_id, ratee_id, stars, low_rating_reason,
    rater_bias, corrected_rating, reviewer_weight
  )
  values (
    p_lobby, v_rater, p_ratee, p_stars, p_reason,
    v_bias, v_corrected, 1
  )
  returning id into v_review;

  if p_tag_ids is not null then
    foreach v_tag in array p_tag_ids loop
      insert into public.review_tag (review_id, tag_id)
      values (v_review, v_tag)
      on conflict do nothing;
    end loop;
  end if;

  -- Mungkin ulasan terakhir yang ditunggu lobi ini.
  perform public.release_due_reviews();

  return v_review;
end;
$$;

revoke all on function public.rater_bias(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.review_weight(uuid, uuid) from public, anon, authenticated;
revoke all on function public.recompute_reputation(uuid) from public, anon, authenticated;
revoke all on function public.release_due_reviews() from public, anon;
grant execute on function public.release_due_reviews() to authenticated;

-- ── Periksa sendiri ─────────────────────────────────────────────────────
do $verify$
declare
  v_bias numeric;
begin
  -- Penilai tanpa riwayat harus berbias 0: (5*3 + 0) / (5 + 0) - 3 = 0.
  v_bias := public.rater_bias(gen_random_uuid(), now());
  if v_bias is distinct from 0 then
    raise exception 'Bias penilai baru harusnya 0, dapat %', v_bias;
  end if;

  if to_regclass('public.reviews') is null then
    raise exception 'Tabel reviews hilang';
  end if;

  perform public.release_due_reviews();

  raise notice 'Pemeriksaan lolos: bias awal 0, pelepasan ulasan berjalan.';
end
$verify$;
