-- What a player fills in for each game, beyond name, region, rank and roles:
--
--   * the game's own account number, because a name alone doesn't identify
--     anyone in the mobile games. Mobile Legends needs a Player ID and a Zone
--     ID, Free Fire a UID, PUBG Mobile a Character ID. Riot games and CS2 use
--     the name (a Riot ID is "Name#TAG"), so they leave these empty.
--   * which roles are a player's favourites.
--
-- Both are optional, like everything else on the game setup. The digits-only
-- checks mirror what the form accepts (src/data/game-accounts.ts); the lengths
-- are loose on purpose, because the formats come from guides, not the
-- publishers, and a rule that is too tight would lock out a real account.
--
-- Columns are granted one by one, as for the rest of this table, so nothing
-- else on the row can be written through the API.
--
-- Never edit this file once it has run — fix with a new migration.

alter table public.user_game_mapping
  add column account_id text
    check (account_id is null or account_id ~ '^[0-9]{1,20}$'),
  add column zone_id text
    check (zone_id is null or zone_id ~ '^[0-9]{1,8}$');

alter table public.user_game_roles
  add column is_favorite boolean not null default false;

grant insert (account_id, zone_id) on public.user_game_mapping to authenticated;
grant update (account_id, zone_id) on public.user_game_mapping to authenticated;
-- Roles are replaced as a set (delete, then insert), so only insert needs it.
grant insert (is_favorite) on public.user_game_roles to authenticated;
