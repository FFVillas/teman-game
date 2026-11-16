-- Kekuatan tag personalitas: Persamaan 3.13.
--
-- Fase 1, pelengkap §6.3. Ditemukan saat menyambungkan kodenya.
--
-- ── Kenapa harus fungsi, tidak bisa dihitung di aplikasi ────────────────
-- Persamaan 3.13 butuh n_t, yaitu jumlah PENILAI BERBEDA yang memberi sebuah
-- tag. Itu berarti membaca `review_tag` — dan tabel itu sengaja tertutup rapat
-- dari klien demi anonimitas (`20261116000200_reviews.sql`).
--
-- Jalan keluarnya: fungsi security definer yang hanya mengembalikan hasil
-- AGREGAT. "Tiga penilai memberi tag Chill" tidak membocorkan siapa pun,
-- sementara isi `review_tag` tetap tidak bisa disentuh klien.
--
-- ── Satu hal yang mudah salah ───────────────────────────────────────────
-- Penyebut pada Persamaan 3.13 adalah suara terbanyak di antara SELURUH tag
-- yang dimiliki pengguna — termasuk tag yang tidak pernah ia pilih sendiri
-- tapi diberikan penilai. Contoh di proposal memperlihatkannya: Flex Player
-- tidak dipilih sendiri, hanya diberi 6 penilai, dan tetap bernilai 0,67.
--
-- Jadi himpunannya adalah GABUNGAN dari tag pilihan sendiri (`user_tag`) dan
-- tag pemberian penilai (`review_tag`), bukan `user_tag` saja.

create function public.tag_strengths(p_users uuid[])
returns table (user_id uuid, tag_id smallint, strength numeric)
language sql
stable
security definer
set search_path = public
as $$
  with jendela as (
    -- Persamaan 3.9: 25 ulasan terakhir per orang, yang sudah dirilis.
    select r.id, r.ratee_id, r.rater_id
    from (
      select r.id, r.ratee_id, r.rater_id,
             row_number() over (
               partition by r.ratee_id order by r.created_at desc
             ) as urutan
      from public.reviews r
      where r.ratee_id = any(p_users)
        and r.effective_at is not null
        and r.effective_at <= now()
    ) r
    where r.urutan <= 25
  ),
  diberi as (
    -- n_t: penilai BERBEDA, bukan jumlah ulasan. Satu orang yang memberi tag
    -- sama di dua lobi tetap dihitung satu.
    select j.ratee_id as user_id,
           rt.tag_id,
           count(distinct j.rater_id) as n
    from jendela j
    join public.review_tag rt on rt.review_id = j.id
    group by j.ratee_id, rt.tag_id
  ),
  dipilih as (
    -- p_t: 1 kalau pengguna memilihnya sendiri saat membuat akun.
    select ut.user_id, ut.tag_id
    from public.user_tag ut
    where ut.user_id = any(p_users)
  ),
  gabungan as (
    select coalesce(d.user_id, p.user_id) as user_id,
           coalesce(d.tag_id, p.tag_id) as tag_id,
           (case when p.user_id is null then 0 else 1 end)
             + coalesce(d.n, 0) as suara
    from diberi d
    full join dipilih p
      on p.user_id = d.user_id and p.tag_id = d.tag_id
  )
  select g.user_id,
         g.tag_id,
         -- Normalisasi min-max dengan minimum 0: tag tersering bernilai 1,00.
         round(
           g.suara::numeric / max(g.suara) over (partition by g.user_id),
           3
         ) as strength
  from gabungan g;
$$;

-- Aman dibuka: keluarannya agregat, tidak ada identitas penilai di dalamnya.
-- Dibutuhkan anon juga, karena daftar lobi dan kartu pemain dibaca tanpa login.
grant execute on function public.tag_strengths(uuid[]) to anon, authenticated;

-- ── Periksa sendiri ─────────────────────────────────────────────────────
do $verify$
declare
  v_user uuid;
  v_baris int;
  v_maks  numeric;
begin
  -- Pengguna yang punya tag pilihan sendiri tapi belum pernah dinilai harus
  -- bernilai 1,00 untuk semua tagnya — revisi menyebutnya tegas supaya
  -- pengguna baru tetap bisa direkomendasikan.
  select ut.user_id into v_user
  from public.user_tag ut
  where not exists (
    select 1 from public.reviews r where r.ratee_id = ut.user_id
  )
  limit 1;

  if v_user is null then
    raise notice 'Lewati uji: tidak ada pengguna bertag yang belum dinilai.';
    return;
  end if;

  select count(*), max(strength) into v_baris, v_maks
  from public.tag_strengths(array[v_user]);

  if v_baris = 0 then
    raise exception 'tag_strengths tidak mengembalikan baris untuk pengguna bertag';
  end if;

  if v_maks is distinct from 1.000 then
    raise exception 'Pengguna belum dinilai harusnya berkekuatan 1,000, dapat %', v_maks;
  end if;

  raise notice 'Pemeriksaan lolos: % tag, pengguna baru bernilai 1,000.', v_baris;
end
$verify$;
