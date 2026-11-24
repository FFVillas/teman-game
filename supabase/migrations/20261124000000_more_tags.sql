-- Five more personality tags (5 -> 10).
--
-- The proposal names its five as examples ("tag personalitas, seperti Shot
-- Caller, Positive Mental Attitude (PMA), Chill, Never Surrender, atau Flex
-- Player"), so the list was always open. Two reasons to extend it:
--
--   * A player picks 3 to 5 tags. With only five to pick from, the upper limit
--     could never be reached from the form (TC-22), and a player could claim
--     every tag, which made T = 1 for them in every lobby until rated.
--   * The five are all praise. These add traits that differ between people
--     without one being the better answer (Talkative / Introverted, Humorous /
--     Serious), so a tag says who fits a lobby, not only who is nice.
--
-- Nothing else changes: 3-5 per player (check_user_tag_count), at most 3 per
-- lobby (check_lobby_tag_count), and Persamaan 3.13 counts whatever tags exist.
-- Existing players keep the tags they have.
--
-- RUN THIS BEFORE deploying the web code that lists the new tags: the forms
-- offer them from the code, and saving one the table doesn't have is refused.
-- The other order is safe (older code ignores names it doesn't know).
--
-- Keep the names in step with `personalityTagOptions` in
-- src/data/player-profiles.ts.

insert into public.tag (name, sort_order) values
  ('Talkative', 6),
  ('Introverted', 7),
  ('Humorous', 8),
  ('Serious', 9),
  ('Focused', 10)
on conflict (name) do nothing;

-- Check: expect 10 rows, in this order.
select id, name, sort_order from public.tag order by sort_order;
