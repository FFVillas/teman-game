# Image sources and rights

Where the game artwork in `public/` came from. Keep this current when images
are added; it doubles as the attribution list for the thesis.

All game artwork (rank badges, role icons, key art, logos) belongs to its
publisher. It is used here to identify the games in a non-commercial student
project. The publishers' fan-content policies are the authority on what is
allowed; this file records sources, it is not a licence. The footer still
needs the "not affiliated with" disclaimer.

| What | Where in `public/` | Source | Added |
|---|---|---|---|
| Valorant rank icons (25, per division) | `ranks/valorant/` | Valorant Wiki on Fandom, category "Rank Images" (`valorant.fandom.com/wiki/Category:Rank_Images`) | 2026-10-06 |
| League of Legends rank crests (10 tiers, Season 2023 set) | `ranks/league-of-legends/` | League of Legends Wiki, "Rank" page (`wiki.leagueoflegends.com/en-us/Rank`) | 2026-10-06 |
| League of Legends role icons (5) | `roles/league-of-legends/` | Downloaded by the project owner; exact source page not recorded. Jungle is the Wild Rift version (80 px) | 2026-10-06 |
| Valorant role icons (4) | `roles/valorant/` | Already in the project (moved from `icons/`); original source not recorded | earlier |
| League of Legends lobby covers (4) | `lfg/covers/league-of-legends/` | Downloaded by the project owner (files named league 1, ranked flex, Solo duo, arena); source pages not recorded | 2026-10-06 |
| League of Legends game card | `games/league-of-legends.webp` | Downloaded by the project owner; source page not recorded | 2026-10-06 |
| Valorant lobby covers (4) | `lfg/covers/valorant/` | Already in the project; original source not recorded | earlier |
| Login panel art (Valorant, LoL, MLBB) | `auth/` | Already in the project; original source not recorded | earlier |
| Mobile Legends rank emblems (10 tiers) | `ranks/mobile-legends/` | Downloaded by the project owner (files named `logo-icon-rank-<tier>-png-ml.png`); source page not recorded | 2026-11-18 |
| Free Fire rank badges (7 tiers) | `ranks/free-fire/` | seeklogo.com, one sheet of every badge (`rank-ff-seeklogo.png`); cropped per tier here | 2026-11-18 |
| Mobile Legends / PUBG Mobile / Free Fire lobby covers (4 each) | `lfg/covers/<game>/` | Downloaded by the project owner from wallpaper sites; source pages not recorded | 2026-11-18 |
| Mobile Legends lane icons (5) | `roles/mobile-legends/` | Mobile Legends: Bang Bang Wiki on Fandom (`Gold_Lane.png`, `EXP_Lane.png`, `Mid_Lane.png`, `Jungling.png`, `Roaming.png`) | 2026-11-18 |
| Counter-Strike 2 rank badges (7 tiers) | `ranks/counter-strike-2/` | Counter-Strike Wiki on Fandom, Matchmaking page (`Skillgroup<n>_new.png`); the highest skill group of each tier was taken, since the badges are keyed per tier here | 2026-11-18 |
| **Bounce, the mascot** (28 poses), app icons, PWA icons, favicon | `mascot/`, `icons/logo-mark.svg`, `pwa/`, `src/app/favicon.ico` | **Made by the team** — original work, no third-party rights involved. Delivered as `Teman Game Logo package.zip` with a showcase at `TemanGame-Bounce.html`. The PWA icons and the favicon are generated from it, not drawn separately | 2026-11-20 |

Files were recompressed to WebP and resized (ranks to 128 px, covers to 900 px
wide, panels to 1600 px wide). Raw downloads live in the git-ignored `inbox/`.

**Approved sources.** Riot's Developer Policy lists Data Dragon and the Riot Press Kit as the assets products should use, and limits Riot logos to cases where use is unavoidable. The rank icons here came from fan wikis, not from those two. Fine for a thesis demo; if the product is ever published for real, swap the Riot icons for Press Kit versions.

**Still missing art** (the badge falls back to a plain marker, roles show as
text):

| What | Why it isn't here |
|---|---|
| PUBG Mobile landing card | `games/pubg-battlegrounds.png` is PUBG: BATTLEGROUNDS (PC) cover art — the title "PUBG BATTLEGROUNDS" is printed on it — while the game we support is PUBG **Mobile**. Visible on the landing page and in lobby cards that fall back to it |
| PUBG Mobile rank icons (10 tiers) | The set collected in November is PUBG: BATTLEGROUNDS (PC) — medals with ribbons, tiers Bronze…Diamond, Master, Grandmaster. PUBG **Mobile** uses different art and a different top end (Crown, Ace, Ace Master, Ace Dominator, Conqueror), so none of it fits. Searched on 18 Nov without success: the Fandom PUBG Mobile wiki's "Rank System" page embeds no images at all and its file list is unsorted screenshots; the PUBG (PC) wiki only has PC medals; Liquipedia returns 403 to automated requests; seeklogo's "rank" series (624089, 624090) turned out to be Free Fire. The guides that do show the badges credit them to KRAFTON directly. **Next step: screenshot the in-game rank screen** — that also gives the thesis a source it can name |

PUBG Mobile and Free Fire have **no roles at all** in this model, deliberately —
neither game defines official ones. That is a decision, not missing art.

**To do:** fill in the "not recorded" sources if they can be found.
