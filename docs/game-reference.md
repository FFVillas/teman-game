# Game reference — ranks, roles and regions

Reference data for the six in-scope games (see [`thesis-spec.md`](thesis-spec.md)).
It backs the `games`, `game_ranks`, `game_roles` and `user_game_mapping`
tables in `supabase/migrations/20261003000200_games.sql`, and the per-game
region lists the app will offer.

**Researched 2026-10-03 (revised 2026-10-05) from web sources, not from the
games themselves.** Game ranks and servers change between seasons, so treat
every row as "last known". The "To verify in-game" list under each game is for
someone who actually plays it. Five minutes in the game beats any article.

## How to read the confidence marks

| Mark | Meaning |
| --- | --- |
| ✅ | Several independent sources agree |
| ⚠️ | Sources disagree, or only one source, or it looks recently changed |
| ❓ | Not found / unclear. Needs an in-game check before relying on it |

## Decisions taken so far

1. **Roles are stored only for games that define them.** Valorant (agent
   classes), League of Legends (positions) and Mobile Legends (lanes) have
   roles. **Counter-Strike 2, PUBG Mobile and Free Fire do not**: their "roles"
   are community habits, not something the game assigns or enforces, so the
   app does not ask for them.
   *Valorant is a tactical FPS, not a MOBA, but it is kept:* its four agent
   classes are official, and the lobby UI (role icons, role filter, onboarding
   chips) is already built on them. Say so if it should go too.
2. **Counter-Strike 2 ranks use the 18-rank Competitive ladder only.** Premier
   (a number) is parked.
3. **Free Fire ranks follow the Vandal ladder** (Bronze to Diamond, Heroic,
   Grandmaster, 20 steps). Other sources add Elite Heroic, Master and Elite
   Master. See the Free Fire section.
4. **Regions are regional groups, never countries.** See
   [Region options](#region-options-proposal).
5. **Game modes** are a researched list below; the group-play ones are in
   the database (`game_modes`, seeded by `20261006000000_lobbies.sql`).
6. **Region lists live in the app for now** (`src/data/game-regions.ts`,
   option A), not a database table. Moving to a `game_regions` table later is
   a new migration plus a data move, not a rewrite; the four non-official
   games are Asia only.

## At a glance

| Game | Ranks (steps) | Top tier is | Roles | Account region concept | Confidence |
| --- | ---: | --- | --- | --- | --- |
| Valorant | **25** | Radiant (top 500 per region) | 4 (official) | Shard (AP, EU, NA, …), bound to account | ✅ |
| League of Legends | **31** | Challenger | 5 (positions) | Server (SEA, VN2, TW2, …), bound to account | ✅ |
| Counter-Strike 2 | **18** (Competitive) | The Global Elite | **none** | None. Matchmaking picks a datacenter by ping | ✅ ranks / ⚠️ regions |
| Mobile Legends | **30** | Mythical Immortal (100+ stars) | 5 (lanes) | Server, assigned by location, cannot be changed | ⚠️ |
| PUBG Mobile | **34** | Conqueror (top 500 per server) | **none** | Server (6), bound to account, 60-day switch lock | ✅ ranks / ✅ regions |
| Free Fire | **20** | Grandmaster (top 300) | **none** | Country server, fixed by location | ⚠️ |

"Steps" is the length of the flat ladder stored in `game_ranks`: every
division counts as one step, so `ordinal` runs `0 … steps-1` and
ΔR = |ordinal A − ordinal B|.

---

## Valorant

**Ranks: 25 steps** ✅ (nine tiers; eight with three divisions, then Radiant)

| # | Tier | Divisions | Ordinals | Steps |
| ---: | --- | --- | --- | ---: |
| 1 | Iron | 1, 2, 3 | 0–2 | 3 |
| 2 | Bronze | 1, 2, 3 | 3–5 | 3 |
| 3 | Silver | 1, 2, 3 | 6–8 | 3 |
| 4 | Gold | 1, 2, 3 | 9–11 | 3 |
| 5 | Platinum | 1, 2, 3 | 12–14 | 3 |
| 6 | Diamond | 1, 2, 3 | 15–17 | 3 |
| 7 | Ascendant | 1, 2, 3 | 18–20 | 3 |
| 8 | Immortal | 1, 2, 3 | 21–23 | 3 |
| 9 | Radiant | none | 24 | 1 |

Notes: Radiant is limited to the top ~500 players per region. Rank is
re-evaluated per Act (season); a player's *current* rank is what lobbies
should use, not their peak.

**Roles: 4** ✅ (Riot's agent classes; a player can pick several)

Duelist · Initiator · Controller · Sentinel

**Regions** ✅: the account is bound to one **shard**, and you can only queue
with players on the same shard. Indonesia is on **AP**. Options are listed
under [Region options](#region-options-proposal).

| Value | Shard | Data centers (for reference only) |
| --- | --- | --- |
| `AP` | Asia-Pacific (includes Southeast Asia) | Singapore, Hong Kong, Tokyo, Sydney, Mumbai |
| `KR` | Korea | Seoul |
| `EU` | Europe | Frankfurt, Paris, London, Stockholm, Istanbul, Warsaw, Madrid, Bahrain |
| `NA` | North America | Portland, San Jose, Chicago, Ashburn, Atlanta, Dallas |
| `LATAM` | Latin America | Santiago, Mexico City, Miami |
| `BR` | Brazil | São Paulo |

**To verify in-game:** [ ] still 3 divisions per tier. The data-center list is
only a nice-to-have; the **shard** is what matters for the app.

---

## League of Legends

**Ranks: 31 steps** ✅ (seven tiers with four divisions, then three apex tiers)

| # | Tier | Divisions (low → high) | Ordinals | Steps |
| ---: | --- | --- | --- | ---: |
| 1 | Iron | IV, III, II, I | 0–3 | 4 |
| 2 | Bronze | IV, III, II, I | 4–7 | 4 |
| 3 | Silver | IV, III, II, I | 8–11 | 4 |
| 4 | Gold | IV, III, II, I | 12–15 | 4 |
| 5 | Platinum | IV, III, II, I | 16–19 | 4 |
| 6 | Emerald | IV, III, II, I | 20–23 | 4 |
| 7 | Diamond | IV, III, II, I | 24–27 | 4 |
| 8 | Master | none | 28 | 1 |
| 9 | Grandmaster | none | 29 | 1 |
| 10 | Challenger | none | 30 | 1 |

Notes: Division **IV is the lowest**, I the highest. Emerald was added in
July 2023 (patch 13.14). Master/Grandmaster/Challenger share one leaderboard
and are decided by LP and cutoffs, not divisions. Ranked Solo/Duo and Flex
are separate ladders, and the app should use **Solo/Duo**. A player with no
ranked rank yet keeps `rank_id` empty.

**Roles: 5** ✅ (the five positions)

Top · Jungle · Mid · Bot (ADC) · Support

Riot's API names them `TOP`, `JUNGLE`, `MIDDLE`, `BOTTOM`, `UTILITY`, which is
useful if the Riot API is ever integrated.

**Regions** ✅: the account is bound to a **server**. **There is no Indonesia
server; Indonesia plays on SEA.**

| Value | Server | Covers |
| --- | --- | --- |
| `SEA` | Southeast Asia (**was `SG2`**) | Singapore, Malaysia, Indonesia, Thailand, Philippines |
| `VN2` | Vietnam | Vietnam |
| `TW2` | Taiwan | Taiwan, Hong Kong, Macao |
| `JP1` | Japan | Japan |
| `KR` | Korea | Korea |
| `OC1` | Oceania | Australia, New Zealand |
| `ME1` | Middle East (Bahrain, launched 26 Jun 2024) | Middle East |
| `NA1` | North America | NA |
| `EUW1` | Europe West | EUW |
| `EUN1` | Europe Nordic & East | EUNE |
| `BR1` | Brazil | Brazil |
| `LA1` / `LA2` | Latin America North / South | LAN / LAS |
| `TR1` | Turkey | Turkey |

⚠️ **Our app still says `SG2`** (`src/data/regions.ts`). TH2, PH2 and SG2 were
merged into one server on 8 Jan 2025 and SG2 was renamed **SEA**.
⚠️ Russia is omitted because its status could not be confirmed.

**To verify in-game:** [ ] Emerald still sits between Platinum and Diamond ·
[ ] the server list in the client's region picker.

---

## Counter-Strike 2

CS2 has **two** ranked systems that run side by side. Only the first fits a
ladder.

**Ranks: 18 steps (Competitive)** ✅

| # | Tier | Ranks | Ordinals | Steps |
| ---: | --- | --- | --- | ---: |
| 1 | Silver | I, II, III, IV, Elite, Elite Master | 0–5 | 6 |
| 2 | Gold Nova | I, II, III, **Master** | 6–9 | 4 |
| 3 | Master Guardian | I, II, Elite | 10–12 | 3 |
| 4 | Distinguished Master Guardian | none | 13 | 1 |
| 5 | Legendary Eagle | none | 14 | 1 |
| 6 | Legendary Eagle Master | none | 15 | 1 |
| 7 | Supreme Master First Class | none | 16 | 1 |
| 8 | The Global Elite | none | 17 | 1 |

⚠️ The fourth Gold Nova rank is **"Gold Nova Master"**, not "Gold Nova IV". The
seed in `20261003000200_games.sql` has this wrong.

**Premier (not modelled)**: a numeric **CS Rating** from 0 to 30,000+ shown in
seven colour bands, with Friends / Region / Global leaderboards. It is a
number, not a ladder, so it does not fit `game_ranks`. Parked on purpose.

| Band | CS Rating |
| --- | --- |
| Gray | 0 – 4,999 |
| Light blue | 5,000 – 9,999 |
| Blue | 10,000 – 14,999 |
| Purple | 15,000 – 19,999 |
| Pink | 20,000 – 24,999 |
| Red | 25,000 – 29,999 |
| Yellow | 30,000+ |

**Roles: none stored.** CS2 does not assign roles. Entry fragger, AWPer,
rifler, support, lurker and IGL are how teams divide the work, not something
the game enforces, and every player buys from the same weapon pool. Not asked
in onboarding or the profile.

**Regions** ⚠️: CS2 has **no account region**. Matchmaking picks a datacenter
by ping and the player can restrict which ones. For the app this field means
*"preferred region"*, not a fixed server. Valve's datacenter groups are US
East, US West, Europe, Russia, Asia, South America, Australia and Africa. The
Asia group is too wide for us (Singapore ping to Tokyo is 70+ ms), so the
proposal below splits it. See [Region options](#region-options-proposal).

**To verify in-game:** [ ] ranks list incl. "Gold Nova Master" · [ ] which
datacenters Southeast Asia actually matches into · [ ] whether to use
Competitive, Premier, or both.

---

## Mobile Legends: Bang Bang

**Ranks: 30 steps** ⚠️ (sources disagree on division counts for the middle
tiers; the table follows the most recent source, updated March 2026)

| # | Tier | Divisions (low → high) | Ordinals | Steps |
| ---: | --- | --- | --- | ---: |
| 1 | Warrior | III, II, I | 0–2 | 3 |
| 2 | Elite | IV, III, II, I | 3–6 | 4 |
| 3 | Master | IV, III, II, I | 7–10 | 4 |
| 4 | Grandmaster | V, IV, III, II, I | 11–15 | 5 |
| 5 | Epic | V, IV, III, II, I | 16–20 | 5 |
| 6 | Legend | V, IV, III, II, I | 21–25 | 5 |
| 7 | Mythic | none (0–24 stars) | 26 | 1 |
| 8 | Mythical Honor | none (25–49 stars) | 27 | 1 |
| 9 | Mythical Glory | none (50–99 stars) | 28 | 1 |
| 10 | Mythical Immortal | none (100+ stars) | 29 | 1 |

Notes:
- ⚠️ One source lists Elite as III–I and Grandmaster/Epic/Legend as IV–I;
  another (March 2026) lists IV–I and V–I as above. **Count the divisions in
  the game** before trusting steps 3–25.
- ⚠️ One source says Mythic now uses **points** with divisions (IV 1–149,
  III 150–199, II 200–299, I 300–599) instead of stars. If true, Mythic is
  four steps, not one, and the total becomes 33. Needs an in-game check.
- Mythic and above are open-ended star counts, so the flat ladder loses
  detail up there: 100 and 400 stars are both "Immortal".
- Rank resets each season (a partial reset, not back to Warrior).

**Roles: 5 lanes** ✅ (player positions; this is what an LFG needs)

Gold Lane · EXP Lane · Mid Lane · Jungle · Roam

Separate concept, **not stored as player roles**: the six *hero* classes
(Tank, Fighter, Assassin, Mage, Marksman, Support). Marksman usually plays
Gold Lane, Fighter EXP Lane, Mage Mid, Assassin Jungle, Tank/Support Roam.

**Regions** ⚠️: the account is assigned a server **by location** at first
login and **cannot be changed in the game**; the game shows it as the **Zone
ID** next to the User ID. Sources mention servers for Southeast Asia
(Singapore, Malaysia, Vietnam, Indonesia, Thailand and others), Japan, Korea,
China (launched Jan 2025), Russia, Europe and the US/Latin America. The exact
list and whether neighbouring SEA servers share one player pool could not be
confirmed. Indonesian players are on the **Indonesia** server.

**To verify in-game:** [ ] division counts per tier · [ ] whether Mythic uses
points + divisions · [ ] **whether Indonesia, Malaysia, Singapore etc. can
group together** (decides if "SEA" is one region or several) · [ ] the real
server list.

---

## PUBG Mobile

**Ranks: 34 steps** ✅ (six tiers × five divisions, then the Ace family and Conqueror)

| # | Tier | Divisions (low → high) | Ordinals | Steps |
| ---: | --- | --- | --- | ---: |
| 1 | Bronze | V, IV, III, II, I | 0–4 | 5 |
| 2 | Silver | V, IV, III, II, I | 5–9 | 5 |
| 3 | Gold | V, IV, III, II, I | 10–14 | 5 |
| 4 | Platinum | V, IV, III, II, I | 15–19 | 5 |
| 5 | Diamond | V, IV, III, II, I | 20–24 | 5 |
| 6 | Crown | V, IV, III, II, I | 25–29 | 5 |
| 7 | Ace | none | 30 | 1 |
| 8 | Ace Master | none | 31 | 1 |
| 9 | Ace Dominator | none | 32 | 1 |
| 10 | Conqueror | none | 33 | 1 |

Notes:
- ⚠️ Ace, Ace Master and Ace Dominator are described in different ways: some
  sources call them three **stages of one Ace tier** (starting at roughly
  4,200 / 4,700 / 5,200 RP), others as three separate tiers. Modelled here as
  three steps either way. Exact RP thresholds change per season and are
  **not stored**.
- Conqueror is reserved for the **top 500 per server**, so it is leaderboard
  based, not points based.
- Switching server **resets rank to Bronze V** on the new server.

**Roles: none stored.** PUBG Mobile has no role system. IGL, entry fragger,
support, sniper and scout are squad habits, not game features. Not asked in
onboarding or the profile.

**Regions** ✅: six official servers, bound to the account; a server change
locks for 60 days. Indonesia is on **Asia**. India (Battlegrounds Mobile
India) and China (Peacekeeper Elite) are separate apps with their own
servers, so they are not options. Listed under
[Region options](#region-options-proposal).

**To verify in-game:** [ ] Ace Master / Ace Dominator are separate or part of
Ace · [ ] current Crown divisions · [ ] server list in settings.

---

## Free Fire

Ranked exists for **Battle Royale** and **Clash Squad**, with similar
ladders. The ladder below is Battle Royale ranked.

**Ranks: 20 steps** ⚠️ (follows the Vandal page the team chose; see the note
about other sources)

| # | Tier | Divisions (low → high) | Ordinals | Steps |
| ---: | --- | --- | --- | ---: |
| 1 | Bronze | I, II, III | 0–2 | 3 |
| 2 | Silver | I, II, III | 3–5 | 3 |
| 3 | Gold | I, II, III, IV | 6–9 | 4 |
| 4 | Platinum | I, II, III, IV | 10–13 | 4 |
| 5 | Diamond | I, II, III, IV | 14–17 | 4 |
| 6 | Heroic | none | 18 | 1 |
| 7 | Grandmaster | none | 19 | 1 |

Rank points on that page: Bronze about 1,000–1,300 RP up to Diamond about
2,601–3,200 RP; Heroic is above 3,200 RP; **Grandmaster is the top 300 players
in Heroic**, with no fixed point requirement. (RP figures are not stored.)

⚠️ **Other sources disagree.** Two 2025 articles list a longer ladder: Heroic,
**Elite Heroic, Master, Elite Master**, then Grandmaster, which would make it
**23 steps**. The Vandal page does not mention those three tiers at all, so
either they are newer than that page or they do not exist. Whichever is right,
adding them later is a data change (new rows, ordinals shift), not a schema
change.
⚠️ One source says Grandmaster has sub-tiers I–III; others say none.
Treated as a single step.
Within Bronze to Diamond, **Gold, Platinum and Diamond have four divisions;
Bronze and Silver have three**. Easy to get wrong.

**Roles: none stored.** Free Fire has no assigned squad roles. Players talk
about rushers, snipers and supporters, and one source says Free Fire MAX
introduced "roles", but it was not possible to confirm that is a game feature
rather than character-skill styles. Not asked in onboarding or the profile.

**Regions** ⚠️: servers are **fixed by Garena according to location**; the
player cannot choose. Sources list servers for Indonesia, Singapore,
Malaysia, Thailand, Vietnam, Taiwan, India, Bangladesh, Pakistan, Brazil, the
US, Mexico/Latin America, Middle East, Africa, Europe and Russia. Garena itself
groups its 2025 esports into five regions (Southeast Asia, Brazil, Latin
America, Middle East & Africa, Pakistan), plus a US circuit announced for
2026. That grouping is the precedent for the proposal below. Indonesian
players are on the **Indonesia** server.

**To verify in-game:** [ ] is Elite Heroic / Master / Elite Master a rank ·
[ ] Grandmaster sub-tiers · [ ] current server list · [ ] Clash Squad uses
the same ladder.

---

## Accounts (what the form asks for)

What a player enters to identify themselves in each game. ⚠️ From guides and
news pages (Riot ID rules, PUBG and Free Fire ID guides, Mobile Legends top-up
guides), **not** the publishers' own documentation: check each in the game
before tightening a rule. The checks in `src/data/game-accounts.ts` are
deliberately loose (digits only) for that reason.

| Game | Asked for | Stored in |
|---|---|---|
| Valorant, League of Legends | Riot ID, `Name#TAG` (name 3 to 16 characters, tag 3 to 5; one ID covers both games) | `in_game_name` |
| Counter-Strike 2 | Steam name (no separate in-game ID) | `in_game_name` |
| Mobile Legends | Nickname, Player ID and Zone ID (the game shows `12345678 (1234)`, and people swap the two) | `in_game_name`, `account_id`, `zone_id` |
| PUBG Mobile | Character name and Character ID (the ID can't change, the name can) | `in_game_name`, `account_id` |
| Free Fire | Nickname and UID (about 9 to 10 digits, never changes) | `in_game_name`, `account_id` |

Everything is optional and self-reported; nothing is verified. Not asked for on
purpose: peak rank (current rank only), hero or agent pools (no list in the
catalog), and any "verified" mark.

## Game modes

What each game lets you queue for, researched 2026-10-06 from web sources
(the same caveat as everything above: articles, not the games). A lobby is
created *for a mode*, and the mode decides three things in the app: the
largest group the queue allows (the "group size" cap in the create form), a
label (`ranked` / `casual` / `tournament`, the three labels lobbies already
carry), and whether a rank requirement makes sense.

Only modes people **group up for** are offered in the app
(`game_modes`, column "In the app"). Solo and free-for-all modes
(Deathmatch, Arms Race, Co-Op vs AI…) are listed here for completeness but
left out, because there is nobody to look for. **Rotating** modes come and go
with patches and events, so that list needs a look each season.

**Ranked** here means it moves the player's rank on the game's ladder
(Valorant's Premier and CS2's Premier have their own standings instead).

### Valorant ⚠️ (newer modes rest on one June 2026 article)

| Mode | Format | Ranked | Permanent | In the app |
| --- | --- | --- | --- | --- |
| Competitive | 5v5 | yes | yes | ✅ ranked, party 5 |
| Premier | 5v5, teams of five only, scheduled cycles | own standings | yes | ✅ tournament, party 5 |
| Unrated | 5v5 | no | yes | ✅ casual, party 5 |
| Swiftplay | 5v5, first to 5 rounds, 15–20 min | no | yes | ✅ casual, party 5 |
| Spike Rush | 5v5, best of 7, shared loadouts | no | yes | ✅ casual, party 5 |
| Team Deathmatch | 5v5 | no | yes | no (low value for LFG) |
| Escalation | 5v5, cycle through 12 weapons | no | yes | no |
| Knockout | 5v5 | no | yes | no |
| Skirmish | 1v1 up to 5v5 | no | yes | no |
| Retake | 3v3, post-plant | no | yes | no |
| Deathmatch | free for all, 12 players | no | yes | no (solo) |
| Snowball Fight, Custom | seasonal / private | no | rotating | no |

Party limits were not stated for most modes; **Competitive in particular
restricts parties by rank spread**, which was not researched.

### League of Legends ✅ (as of 25 Sep 2026)

| Mode | Format | Ranked | Max party | Permanent | In the app |
| --- | --- | --- | --- | --- | --- |
| Ranked Solo/Duo | 5v5, draft with bans | yes | 2 | yes | ✅ ranked |
| Ranked Flex | 5v5, draft with bans | yes (separate rating) | 5 | yes | ✅ ranked |
| Normal Draft | 5v5, same draft as ranked | no | 5 | yes | ✅ casual |
| Swiftplay | 5v5, level-3 start, 25 min sudden death | no | 5 | yes (replaced Blind Pick and Quickplay in 2025) | ✅ casual |
| ARAM | 5v5, random champions | no | 5 | yes | ✅ casual |
| ARAM: Mayhem | ARAM with augments | no | 5 | ⚠️ one source says permanent, another rotating | ✅ casual, rotating |
| Arena | 2v2 duos, eight duos per match | no | 2 | long-running, not officially permanent | ✅ casual, party 2, rotating |
| URF / ARURF | 5v5, huge cooldown reduction | no | 5 | rotating | ✅ casual, rotating |
| Clash | 5v5 bracket tournament | no | 5 | long-running | ✅ tournament, rotating |
| Co-Op vs AI | five humans vs bots | no | 5 | yes | no (not a lobby) |

Also seen: **Ranked 5s**, a weekend-only premade ranked queue (through 6 Sep
2026), an event, not listed. Teamfight Tactics is a separate game inside the
same client and is out of scope. The ARAM maps are Howling Abyss, Butcher's
Bridge and Koeshin's Crossing.

### Counter-Strike 2 ✅

| Mode | Format | Ranked | Max party | In the app |
| --- | --- | --- | --- | --- |
| Premier | 5v5, map pick and ban | yes (CS Rating) | 5 | ✅ ranked |
| Competitive | 5v5, bomb defusal | yes (18 ranks) | 5 | ✅ ranked |
| Wingman | 2v2, small maps, one site | yes | 2 | ✅ ranked, party 2 |
| Casual | 10v10, no friendly fire | no | 5 | ✅ casual |
| Deathmatch | free for all | no | n/a | no (solo) |
| Arms Race | free for all, gun progression | no | n/a | no (solo) |

⚠️ **Demolition**: one source lists it, another says CS2 launched without it
(and without Danger Zone). Not in the app either way. Round counts differ
between sources (13 vs 16 to win) and are not stored.

### Mobile Legends ⚠️ (from search snippets; the detailed page was blocked)

| Mode | Format | Ranked | Permanent | In the app |
| --- | --- | --- | --- | --- |
| Ranked | 5v5 | yes | yes | ✅ ranked, party 5 |
| Classic | 5v5, no rank loss (win rate still counts) | no | yes | ✅ casual |
| Brawl | single lane, random heroes, short | no | yes | ✅ casual |
| Custom | 5v5 private room | no | yes | ✅ casual |
| Arcade (Mayhem, Deathbattle, Mirror…) | varies, event rotation | no | rotating | ✅ one entry, rotating |
| Magic Chess | auto battler, permanent arcade mode | no | yes | no (not a team mode) |
| VS AI, Hero training | solo | no | yes | no |

**Ranked party limits depend on rank** (higher ranks can group with fewer
people) and were not researched, so the app uses 5.

### PUBG Mobile ⚠️ (the main list is from a 2023 article; maps and events change)

| Mode | Format | Ranked | Permanent | In the app |
| --- | --- | --- | --- | --- |
| Classic, ranked | solo / duo / squad of 4, TPP or FPP, several maps | yes | yes | ✅ Ranked Squad, Ranked Duo |
| Classic, unranked | same | no | yes | ✅ Classic Squad, Classic Duo |
| Team Deathmatch | 4v4 or 8v8, preset weapons | no | yes | ✅ party 4 |
| Ultimate Arena | 4v4 squads, token purchases, first to 4 rounds | no | yes | ✅ party 4 |
| Payload | squads, heavy weapons and vehicles | no | yes | ✅ party 4 |
| Arena Training, Gun Game, Domination, Team vs Team, War, Royale Arena | team arcade modes | no | yes | no |
| Quick Match | shorter battle royale | no | yes | no |
| Metro Royale | loot run against NPCs and players | no | event | no |
| EvoGround | a family of newer modes | no | rotating | no, not researched |

Classic maps named in the source: Erangel, Miramar, Sanhok, Vikendi,
Karakin, Livik and Nusa. Solo queues are not offered (nobody to look for).

### Free Fire ⚠️ (July 2025 article; event modes rotate constantly)

| Mode | Format | Ranked | Permanent | In the app |
| --- | --- | --- | --- | --- |
| Battle Royale, ranked | solo / duo / squad | yes | yes | ✅ Ranked Squad, Ranked Duo |
| Battle Royale, classic | solo / duo / squad | no | yes | ✅ Squad, Duo |
| Clash Squad, ranked | 4v4, buy gear each round | yes | yes | ✅ party 4 |
| Clash Squad, casual | 4v4 | no | yes | ✅ party 4 |
| Lone Wolf | 1v1 or 2v2 duels | not stated | yes | ✅ party 2 |
| Team Deathmatch | 4–5 v 4–5, to 40 kills | not stated | yes | no |
| Event modes | Big Head, Bomb Squad, Gun King, Explosive Jump, Cold Steel, Night Hunter, Rush Hour, Rampage, Fully Charged, Spray & Pray, Kill Secured, Grim Reaper, Zombie Invasion… | no | event | no |
| Custom Rooms, Craftland | private matches, map creator | no | yes | no |

### How the app uses modes, and what is still open

- **In the database since 2026-10-06.** `game_modes` (game, value, label,
  kind, max party, rotating, plus the party rule) is seeded by
  `20261006000000_lobbies.sql`, and a lobby points at a mode. The app reads
  the modes through `fetchGameCatalog`. One more table beyond the proposal.
- **The create form** offers the game's own modes, and the group size cap
  follows the chosen mode (Wingman 2, a squad 4, a normal team 5).
- **The filters on each game's LFG page** (region, mode, rank) already offer
  the game's own options; they are not wired to a list yet.
- **To verify in-game:** party limits per queue, especially ranked queues that
  restrict parties by rank (Valorant, Mobile Legends) · whether ARAM Mayhem
  is permanent · the current PUBG Mobile mode list · which Free Fire event
  modes are live.

---

## Who can play together (party rank rules)

In ranked queues the *game itself* refuses to put players in one party if
their ranks are too far apart. That rule decides whether a lobby is really
"joinable" by someone, so it matters for the LFG filters. Casual modes have
no such limit. Researched 2026-10-06; **these come from guides and news
posts, not from each game's own support page**, and they change between
seasons, so every row is ⚠️.

The short answer to "can a Gold play with a Silver, and must it be the
highest Silver?": **in most of these games the limit is counted in ranks
(tiers), not divisions, so any Silver division works with a Gold.** The
exceptions are the top of Valorant and League of Legends, where the exact
division matters.

| Game | Rule for ranked parties | Counted in |
| --- | --- | --- |
| **Valorant** (Competitive) | Parties of 2–3: Iron/Bronze up to Silver, Silver up to Gold, Gold up to Platinum. From Platinum upward, at most **one tier above the lowest player, same division** (Diamond 1 can group with up to Ascendant 1). Parties of 4 are not allowed. A 5-stack has no rank limit but earns reduced RR | whole tiers at the bottom, **tier and division** from Platinum up |
| **League of Legends** (Ranked Solo/Duo) | Iron/Bronze: Iron to Silver. Silver: Iron to Gold. Gold: Silver to Platinum. Platinum: Gold to Emerald. Emerald: Platinum to Diamond III. Diamond IV–II: Emerald II to Diamond II. Diamond I: Diamond III up to Master under 200 LP. Master: Diamond I or Masters within 400 LP. Grandmaster and Challenger: no duo. (Ranked Flex has its own limits, not researched) | whole tiers at the bottom, **division and LP** near the top |
| **Counter-Strike 2** (Premier) | A gap in **CS Rating**; sources disagree on the size (about 2,000 vs about 5,000). A full party of five is exempt. Unranked players cannot group with ranked ones. Competitive (skill-group) limits not researched | rating points |
| **Mobile Legends** (Ranked) | Party members may be at most **2 ranks apart** | whole ranks (tiers) |
| **PUBG Mobile** (Ranked) | Squad members may be at most **10 divisions apart**. There is also "tier protection" for players dropping when grouped with friends | divisions |
| **Free Fire** (Ranked) | **Heroic and above cannot squad with Diamond or lower**; Master can squad with Diamond and above but not Platinum or lower. Introduced against boosting | rank bands |

⚠️ League of Legends: a 2026 article mentions a **temporary removal of Duo
Queue** around the ranked reset. Whether duo is available right now was not
confirmed.

**The rule depends on who is already in the group, not only on the leader.**
With a Platinum and a Diamond in a Valorant party, a Gold cannot join: the
spread would be two tiers. So "who can join" is recomputed from the current
members every time one joins, and it narrows as the lobby fills. This is
implemented in `src/lib/ranks.ts` (`joinableBounds`) and tested against the
real ladders: Platinum + Diamond closes Gold 2 and Gold 3 and keeps Platinum 3
and Diamond 3; a lone Gold 2 leader opens Silver to Platinum; Mobile Legends
Epic + Legend closes Master and keeps Grandmaster to Mythic.

Which rule applies depends on the game, the mode and the lobby size:

| Game | Rule modelled (`partyRuleFor`) | Applies when |
| --- | --- | --- |
| Valorant | at most 1 tier apart | Competitive, lobby of 4 or fewer. **A 5-stack has no rank limit**, so a lobby of five accepts anyone |
| League of Legends | at most 1 tier apart | Ranked Solo/Duo only |
| Mobile Legends | at most 2 tiers apart | Ranked |
| PUBG Mobile | at most 10 divisions apart | any Ranked mode |
| Free Fire | members all in one band (Bronze to Diamond, or Heroic and up) | any Ranked mode |
| Counter-Strike 2 | none: its limit is a CS Rating gap, which a rank ladder can't express | n/a |

Approximations, on purpose: Iron can reach Silver in both Valorant and
League, Valorant compares divisions from Platinum up, League near the top
too, and Mobile Legends' Mythic tiers count as separate ranks. The game
enforces its real rule when the group queues, so a slightly loose guess only
means a lobby appears that the game then refuses. Casual modes have no rule.

**Decisions (2026-10-06):**

- A lobby has an **optional accepted range** set by the leader (lowest and
  highest tier, either end can be left open); the default is "Any rank",
  because a full group often ignores rank. The leader's own rank is the
  anchor for *closeness* (`M_rank`), exactly as in the proposal; the range
  only adds an eligibility filter on top, and is the one addition beyond it.
- **What a lobby card shows about rank is only the range its leader set**
  ("Silver to Gold", "Diamond and up", or "Any rank"). Not the leader's own
  rank, and not an average (an average of a Silver and a Diamond is a Platinum
  nobody has, and it hides the spread that decides who can join). Who is in the
  lobby, and the leader's rank, are in the details. A card with two rank
  facts was judged too busy.
- The card only shows the leader's *policy*. Whether **you** can join right
  now (the game's party rule applied to who is already in, plus that range)
  is checked where it matters, in the join dialog: the Apply button is
  disabled with the reason ("Your rank (Gold 2) doesn't fit this lobby right
  now. It currently accepts Silver to Platinum."). Signed-out and unranked
  viewers are never blocked.
- The **LFG filter** is one dropdown, **Rank**, with three kinds of value:
  "Fits my rank" (the default for a signed-in player with a rank), "All
  ranks", or a tier (Silver, Gold…). Each means "lobbies that would accept it"
  (`boundsAcceptTier`, generous when a tier only partly fits). Whatever the
  filter lets through, the card's range includes that rank or is "Any rank",
  so the two never contradict each other.
- The **leader's own rank is not shown or filtered**; it stays the anchor for
  closeness (`M_rank`) and only orders the results, as in the proposal. Players
  see the order, never the score. Earlier versions had a from/to range and a
  "Fits my rank" toggle in the filter, and a leader-rank badge plus an "open
  to" line on the card; all were dropped as clumsy or busy.
- A player with **no rank yet** is treated as fitting every lobby.

What the app uses, in short:

- **Two different jobs.** *Eligibility* ("will the game let us group?") is a
  yes/no filter. *Closeness* ("who fits best?") is the ΔR / `M_rank` part of
  the recommendation score. Keep them separate: eligibility removes lobbies,
  closeness orders what is left.
- **A lobby should carry a rank range** (lowest to highest tier it accepts),
  not a single rank, so "Silver to Gold" is expressible.
- **Tier groups come free from the data:** `game_ranks.tier` already groups
  the divisions (Iron, Bronze, Silver…), so a "pick a tier" control needs no
  new data. For games whose tiers are uneven (CS2's Silver group has six
  ranks, Mobile Legends' Mythic is four separate one-step tiers) a tier is
  still the right unit, just not an equal one.
- **Per-game rules differ in kind** (whole tiers, tiers plus division, a
  rating gap, a division count, rank bands), so one universal "within N
  tiers" rule would be wrong for some games. Start with the range the lobby
  states, and add the game's own party rule as data later for ranked modes.

---

## Region options (proposal)

What the app should offer in the "region" dropdown for each game. **Nothing
here is built yet.** This is the brainstorm to react to.

### Rules

1. **A region is a group of players who can actually play together, never a
   country.** Countries are too fine (a Singapore player and a Malaysian one
   share a server) and too many (most games have a handful of server groups,
   not 190 countries).
2. **If the game defines its own regions, use exactly those** (Valorant,
   League of Legends, PUBG Mobile). Players already know them, and it matches
   what decides who can queue together.
3. **If the game has none or they are too coarse, use the shared names below.**
4. **What "region" means differs by game**, and the app should not pretend
   otherwise:
   - *Bound to the account* (Valorant, LoL, PUBG Mobile, Mobile Legends, Free
     Fire): players in different regions **cannot** group. The region is a
     hard filter.
   - *Preference only* (CS2): players in different regions can group, at a
     ping cost. The region is a soft filter at best.
5. **Default for a new player is the Indonesia-first choice** (last column).

### Shared names

Used only where a game has no official regions of its own.

| Code | Name | Covers |
| --- | --- | --- |
| `SEA` | Southeast Asia | Indonesia, Malaysia, Singapore, Thailand, Philippines, Vietnam, Cambodia, Myanmar |
| `EAST_ASIA` | East Asia | Japan, Korea, Taiwan, Hong Kong, Macao |
| `SOUTH_ASIA` | South Asia | India, Pakistan, Bangladesh, Sri Lanka, Nepal |
| `MIDDLE_EAST` | Middle East | Gulf states, Türkiye excluded unless a game lists it, North Africa |
| `AFRICA` | Africa | Sub-Saharan Africa |
| `OCE` | Oceania | Australia, New Zealand |
| `EU` | Europe | all of Europe |
| `NA` | North America | US, Canada, Mexico |
| `LATAM` | Latin America | Spanish-speaking Latin America |
| `BR` | Brazil | Brazil |
| `RU` | Russia & CIS | Russia and neighbours |

### Options per game

| Game | Options | Indonesia default | Confidence |
| --- | --- | --- | --- |
| **Valorant** | `AP` Asia-Pacific · `KR` Korea · `EU` Europe · `NA` North America · `LATAM` Latin America · `BR` Brazil | `AP` | ✅ official shards |
| **League of Legends** | `SEA` · `VN2` Vietnam · `TW2` Taiwan/HK/Macao · `JP1` Japan · `KR` Korea · `OC1` Oceania · `ME1` Middle East · `NA1` · `EUW1` · `EUN1` · `BR1` · `LA1` LAN · `LA2` LAS · `TR1` Turkey | `SEA` | ✅ official servers |
| **PUBG Mobile** *(Asia only)* | `ASIA` · `KRJP` Korea/Japan · `ME` Middle East | `ASIA` | ✅ official servers |
| **Counter-Strike 2** *(Asia only)* | `SEA` · `EAST_ASIA` · `SOUTH_ASIA` · `MIDDLE_EAST` (Valve's single *Asia* group, split) | `SEA` | ⚠️ Valve's groups are real; the Asia split is our proposal |
| **Mobile Legends** *(Asia only)* | `SEA` · `EAST_ASIA` (Japan/Korea) · `MIDDLE_EAST` | `SEA` | ❓ server list unconfirmed |
| **Free Fire** *(Asia only)* | `SEA` · `SOUTH_ASIA` · `EAST_ASIA` (Taiwan) · `MIDDLE_EAST` | `SEA` | ⚠️ server list is from older articles |

**Asia only for these four** (decided 2026-10-05): the thesis audience is
Indonesia, so a worldwide list would be mostly dead options, and it is where
the research is weakest (the non-Asian server lists for Mobile Legends and
Free Fire could not be confirmed). Adding a region later is one new row or
list entry, not a redesign. Valorant and League of Legends keep their full
official lists because those are already complete and certain; they can be
trimmed to Asia the same way if consistency matters more.

### Things to decide

1. **Mobile Legends and Free Fire: one "SEA", or the individual servers?**
   Both games bind the account to a server (Indonesia, Philippines, …). If
   the SEA servers are **separate pools**, a "SEA" filter would show players
   an Indonesian cannot actually group with. This is the single most
   important thing to check in the game. If they are separate, the honest
   option is one level finer for those two games only (for example "Indonesia"
   as its own region), which is still a *region of the game's world*, not a
   free-form country list.
2. **Store the list where?**
   - **A. In the app** (`src/data/game-regions.ts`, keyed by game): lightest,
     and `user_game_mapping.region` stays a text column. A typo or a changed
     list can drift from what is already saved.
   - **B. In the database** (a `game_regions` table next to `game_ranks`, with
     `user_game_mapping` and, later, `lobbies` pointing at it by id): the
     same pattern as ranks and roles, no drift, and lobbies reuse it. It is
     one more table beyond the proposal (20 instead of 19).
   *Recommendation: B*, because lobbies will filter on region and we would
   otherwise maintain the same list in two places.
3. **CS2 "Asia" split**: keep Valve's single Asia group (simplest, matches
   the game) or the four-way split (matches how much ping differs)? The
   proposal splits, because lumping Indonesia with Japan and India is what
   makes a ping filter useless. With the Asia-only decision this split *is*
   the whole CS2 list.
4. **What does a player outside Asia pick** in the four Asia-only games?
   Options: (a) nothing, the game is simply not for them yet; (b) an
   "Other / outside Asia" choice so nobody is blocked while onboarding, which
   matches no lobby and is filtered out of region-based matching. Not needed
   for the Indonesia-first thesis, so (a) is fine until it isn't.

---

## What this means for the rank-distance penalty

`M_rank = max(0.30, 1 − 0.07 × ΔR)` reaches its floor at **ΔR = 10 steps**,
whatever the game. But ladders have very different lengths, so the same 10
steps means a different slice of the ladder:

| Game | Gaps in ladder | ΔR = 10 covers | Equivalent in tiers |
| --- | ---: | ---: | --- |
| Valorant | 24 | 42% | about 3⅓ tiers |
| League of Legends | 30 | 33% | 2½ tiers |
| Counter-Strike 2 | 17 | 59% | more than half the ladder |
| Mobile Legends | 29 | 34% | 2–3 tiers |
| PUBG Mobile | 33 | 30% | 2 tiers |
| Free Fire | 19 | 53% | Bronze I to Gold IV, over half the ladder |

So the penalty is harshest in Counter-Strike 2 and Free Fire and mildest in
PUBG Mobile. The proposal defines the formula once for all games and does not
discuss this; it is worth raising with the advisor, along with the
alternative of normalising ΔR by ladder length. Also note the top tiers
(Radiant, Conqueror, Grandmaster, Immortal…) are leaderboard- or star-based,
so one "step" up there is far larger than one division lower down.

---

## Consequences for the schema and the app

| Area | Change |
| --- | --- |
| `game_roles` seed | Keep rows for **Valorant, League of Legends, Mobile Legends** only. **Remove** CS2, PUBG Mobile and Free Fire rows |
| Onboarding (`RankRoleStep`) | Show the role field only for games that have roles. Today non-Valorant games get a free-text role box; that goes away |
| Profile and lobby | Hide role UI for the three games without roles. The recommendation score does not use roles, so matching is unaffected |
| `user_game_roles` | Stays as designed; simply has no rows for those games |
| Regions | Replace `src/data/regions.ts` (`SG2`, `NA East`, `EU West`) with the per-game lists above once decision 2 is made |

## Seed status

`20261003000200_games.sql` was written before this research and has since
been **corrected in place on 2026-10-05, before it was ever run**: Gold Nova
Master for Counter-Strike 2, role rows only for Valorant / League of Legends /
Mobile Legends (League's "Bot (ADC)" and Mobile Legends' "Jungle" and "Roam"
renamed to match the game's own words), and a header that points here. It now
matches this file.

*If the migration turns out to have been run before that edit, the
corrections need a new migration; an applied one is never edited.*

Counts to expect after running it: Valorant 25, League of Legends 31,
Counter-Strike 2 18, Mobile Legends 30, PUBG Mobile 34, Free Fire 20 ranks;
Valorant 4, League of Legends 5, Mobile Legends 5 roles, the rest none.

Still outside the database on purpose: **regions**. They live in
`src/data/game-regions.ts` (option A in "Things to decide") and are stored as
text in `user_game_mapping.region`. The old `src/data/regions.ts`
(`SG2`, `NA East`, `EU West`) has been **deleted**; its one remaining user, the
create-lobby form, now reads the Valorant list. (`SG2` is now `SEA` in League
of Legends.)

---

## Sources

Researched 2026-10-03, revised 2026-10-05. Fetched pages are marked ✱; the
rest are search results only. Rank names and server names are facts and are
paraphrased, not copied.

**Valorant** — [PC Gamer ranks list](https://www.pcgamer.com/all-valorant-ranks-list/) ·
[WeCoach ranks](https://wecoach.gg/blog/article/valorant-ranks-in-order-distribution-rr-and-act-rank-guide) ·
[Marix ranks 2026](https://marix.app/library/guides/valorant-ranked-tiers-explained-2026) ·
[Hone.gg regions](https://hone.gg/blog/change-server-region-in-valorant/) ·
[ForestVPN server locations](https://forestvpn.com/en/blog/gaming/valorant-server-locations-guide/) ·
[The Spike — SEA regions](https://www.thespike.gg/valorant/news/riot-games-reveal-five-new-first-strike-regions-in-southeast-asia/528)

**League of Legends** — [Exitlag ranks](https://www.exitlag.com/blog/league-of-legends-ranks/) ·
[GGRecon ranks](https://www.ggrecon.com/guides/league-of-legends-ranks/) ·
[Riot — SEA server merge](https://www.leagueoflegends.com/en-sg/news/announcements/the-sea-server-merge-is-coming) ·
[Riot support — League/TFT SEA guide](https://support-teamfighttactics.riotgames.com/hc/en-us/articles/36938006302739-League-TFT-SEA-Server-Guide) ·
[Riot support — Middle East server](https://support-teamfighttactics.riotgames.com/hc/articles/29268172644499) ·
[LoL Wiki — Server](https://wiki.leagueoflegends.com/en-us/Server) ·
[GosuGamers — merge details](https://www.gosugamers.net/lol/news/73851-league-of-legends-sea-server-merge-includes-philippines-thailand-singapore-malaysia-indonesia) ·
[WeCoach server locations](https://wecoach.gg/blog/article/all-server-locations-for-league-of-legends-and-how-to-change-them)

**Counter-Strike 2** — [CSDB ranks guide](https://csdb.gg/guides/ranks-guide/) ·
[OneEsports — CS Rating colours](https://www.oneesports.gg/counter-strike-2/new-cs2-ranking-system-cs-rating-colors/) ·
[WeCoach CS2 ranks 2026](https://wecoach.gg/blog/article/cs2-ranks-premier-rating-and-competitive-system-explained-2026) ·
[GGRecon ranks](https://www.ggrecon.com/guides/csgo-ranking-system/) ·
[SteamDB — server status (datacenter regions)](https://steamdb.com/en/tools/steam-server-status) ·
[Mintlify — CS2 server regions](https://www.mintlify.com/ImLevii/cs2-infra-web/server-management/regions) ·
[Refrag — team roles](https://refrag.gg/blog/cs2-team-roles-explained/) ·
[The Spike — roles](https://thespike.gg/counter-strike-2/beginner-guides/all-cs2-roles-and-positions-guide)

**Party rank rules** — [Esports.gg — what ranks can play together in Valorant](https://esports.gg/guides/valorant/what-ranks-can-play-together-in-valorant) ·
[AFK Gaming — same](https://afkgaming.com/amp/story/esports/guide/what-ranks-can-play-together-in-valorant) ·
[Commonsense Gamer — Valorant](https://commonsensegamer.com/which-ranks-can-play-together-in-valorant/) ·
[Tapin.gg — LoL duo rank restrictions 2026](https://spacex.tapin.gg/blogs/league-duo-rank-restrictions-2026) ·
[Sheep Esports — LoL duo queue removal](https://www.sheepesports.com/us/lol/articles/how-the-temporary-removal-of-duo-queue-will-impact-the-ranked-reset/en) ·
[ProSettings — CS2 ranks and rating](https://prosettings.net/blog/cs2-ranks-and-cs2-rating/) ·
[Pocket Gamer — Mobile Legends ranks](https://www.pocketgamer.com/articles/086102/mobile-legends-ranks) ·
[Codashop — PUBG Mobile tier protection](https://news.codashop.com/bd/how-tier-protection-works-in-pubg-mobile/) ·
[Free Fire Mania — ranked changes (Portuguese)](https://www.freefiremania.com.br/noticia/free-fire-ranqueadas-mudancas.html)

**Game modes** — ✱ [GuildOrder — League of Legends modes (25 Sep 2026)](https://guildorder.com/games/league/wiki/game-modes) ·
✱ [Hotspawn — all Valorant modes (24 Jun 2026)](https://www.hotspawn.com/valorant/guide/all-valorant-game-modes) ·
✱ [GuildOrder — Counter-Strike 2 modes (20 Jun 2026)](https://guildorder.com/games/csgo/wiki/game-modes) ·
✱ [GuruGamer — Free Fire modes (26 Jul 2025)](https://gurugamer.com/mobile-games/list-of-all-game-modes-in-free-fire-25245) ·
✱ [Codashop — PUBG Mobile modes (2023)](https://news.codashop.com/uk/?p=15357) ·
[LoL Theory — LoL modes 2026](https://blog.loltheory.gg/league-of-legends-game-modes/) ·
[Wikipedia — Mobile Legends: Bang Bang](https://en.wikipedia.org/wiki/Mobile_Legends:_Bang_Bang) ·
[Mobile Legends Wiki — Classic](https://mobile-legends.fandom.com/wiki/Classic) (blocked, snippet only)

**Mobile Legends** — ✱ [Joytify ranks (updated 5 Mar 2026)](https://www.joytify.com/blog/en-sg/mobile-legends-ranks/) ·
✱ [Mamikos rank order](https://mamikos.com/info/urutan-rank-mobile-legends-dari-terendah-sampai-tertinggi-gnr/) (disagrees on divisions) ·
[LapakGaming rank list](https://www.lapakgaming.com/blog/en-my/mobile-legends-rank-list/) ·
[Dot Esports ranks](https://dotesports.com/mobile-legends/news/mlbb-ranks-tiers-rewards) (page blocked, search snippet only) ·
[AFK Gaming — changing servers](https://afkgaming.com/mobileesports/guide/6837-how-to-change-servers-in-mobile-legends-ml) ·
[ForestVPN — MLBB server](https://forestvpn.com/en/blog/mobile-gaming/change-server-mobile-legends-without-vpn/) ·
[PlayNews — 6 roles, 5 positions](https://www.playnews.gg/en/guides/mlbb-guide-to-the-6-roles-and-5-positions-to-get-started) ·
[MLBBHub roles](https://mlbbhub.com/roles)

**PUBG Mobile** — ✱ [ProSettings ranks (Apr 2024)](https://prosettings.net/blog/pubg-mobile-ranks/) ·
[Medcom — rank list 2026 (Indonesian)](https://www.medcom.id/teknologi/game/9K5yjQxK-daftar-rank-pubg-mobile-terbaru-2026-dari-terendah-hingga-tertinggi) ·
[esports.net ranks 2026](https://www.esports.net/wiki/guides/pubg-mobile-ranks/) (page unreachable, search snippet only) ·
[Codashop — ranking system](https://news.codashop.com/ph/pubg-mobile-ranking-system/) ·
[Bo3.gg — changing server](https://bo3.gg/games/articles/pubg-mobile-how-to-change-any-server) ·
[Exitlag — servers](https://www.exitlag.com/blog/optimal-pubg-servers-best-regions/)

**Free Fire** — ✱ [Vandal — ranks and rewards](https://vandal.elespanol.com/en/free-fire/free-fire-ranks-all-rewards.html) (the page the team chose for the ladder) ·
[VCGamers — rank order](https://www.vcgamers.com/news/en/?p=214451) (adds Elite Heroic / Master / Elite Master) ·
[Insider Gaming — all ranks](https://insider-gaming.com/all-free-fire-ranks-how-to-hit-grandmaster/) ·
[AFK Gaming — ranked and RP](https://afkgaming.com/mobileesports/news/5282-everything-you-need-to-know-about-ranked-and-rp-in-free-fire) ·
[Sportskeeda — servers](https://sportskeeda.com/free-fire/garena-free-fire-servers-list-servers-available-game) ·
[esports.net — Free Fire esports 2025 roadmap (regions)](https://www.esports.net/news/mobile-games/free-fire-esports-roadmap-2025) ·
[CyberGhost — Free Fire regions](https://www.cyberghostvpn.com/privacyhub/how-to-change-region-in-free-fire/)
