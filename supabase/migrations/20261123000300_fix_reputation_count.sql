-- Fix: recompute_reputation counted every rating n times.
--
-- 20261116000300_reputation_bayes.sql read the window of ratings (jendela) and
-- the weighted copy of it (berbobot), then combined them with
--
--     from jendela j full join berbobot b on true
--
-- which pairs EVERY row of one with EVERY row of the other: n ratings became
-- n * n rows. So, for anyone with n > 1 ratings:
--
--   * review_count was n^2 ("16 ratings from 4 players" for four ratings);
--   * R* (Persamaan 3.10) summed each weighted rating n times, so the prior of
--     3 with weight 5 counted for almost nothing and R* drifted towards the
--     raw average far too early;
--   * reputation_score (the plain average shown, 3.12) was right by accident:
--     every star repeated the same number of times leaves the mean unchanged.
--
-- The body below takes each aggregate from its own set instead. Same window
-- (the 25 latest released ratings), same weights, same rounding. Then every
-- player is recomputed once so the stored numbers are right straight away.

create or replace function public.recompute_reputation(p_user uuid)
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
    round(((5 * 3) + coalesce((select sum(b.w * b.corrected_rating) from berbobot b), 0))
          / (5 + coalesce((select sum(b.w) from berbobot b), 0)), 3),
    -- Persamaan 3.12: rata-rata sederhana, inilah yang dilihat pengguna
    round(coalesce((select avg(j.stars) from jendela j), 0), 2),
    (select count(*) from jendela)
  into v_bayes, v_display, v_count;

  update public.profiles
  set reputation_bayes = coalesce(v_bayes, 3),
      reputation_score = coalesce(v_display, 0),
      review_count = coalesce(v_count, 0)
  where id = p_user;
end;
$$;

-- Put every stored number right now, not at each player's next rating.
do $$
declare
  v_user uuid;
begin
  for v_user in select id from public.profiles loop
    perform public.recompute_reputation(v_user);
  end loop;
end;
$$;

-- Check: review_count must equal the number of released ratings in the
-- window (at most 25). Expect zero rows.
select p.username, p.review_count,
       least(count(r.id), 25) as released_ratings
from public.profiles p
left join public.reviews r
  on r.ratee_id = p.id and r.effective_at is not null and r.effective_at <= now()
group by p.id, p.username, p.review_count
having p.review_count <> least(count(r.id), 25);
