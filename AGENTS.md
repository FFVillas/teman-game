# TemanGame — Agent Notes

Frontend only, for now.

## What this is

TemanGame is a Looking-For-Group (LFG) platform for competitive games:
players find teammates by role, rank, schedule and playstyle, and are
protected by a reputation system that surfaces behavior history *before*
they group up. It's the implementation for a BINUS undergraduate thesis
(skripsi, 2026), so the written proposal — not this repo — is the
authoritative spec.

**Read [`docs/thesis-spec.md`](docs/thesis-spec.md) before doing feature
work.** It covers the recommendation-engine formula, the 13-entity data
model, the target stack (PWA + Supabase + FCM), and — importantly — a
table of what's specified but not yet built. The current code is a UI
shell on mock data; assume a feature is absent unless you've checked.

Two conventions that matter when extending it: the spec says **lobby**
where the code says **team** (`LfgTeam`), and only Valorant is built out
of the six games in scope.

## Stack

- Next.js 16 (App Router), React 19, TypeScript 5
- Tailwind CSS v4 — **CSS-first config, no `tailwind.config.ts`**. Theme
  tokens (colors, fonts) are defined in `src/app/globals.css` via `@theme`.
  Don't hardcode hex colors or font names in components — add a token in
  `globals.css` and use the generated utility (e.g. `bg-brand`,
  `text-text-muted`, `font-heading`) instead.
- Node 22.x
- Path alias: `@/*` → `src/*`

## File structure

```
src/app/                 routes, layout, globals.css (theme tokens live here)
src/app/lfg/<game>/      LFG (find-a-team) page per game, e.g. lfg/valorant
src/components/          reusable UI (Navbar, Footer, Logo, GameCard, FeatureCard)
src/components/sections/ landing page sections (Hero, Features, Stats) — composed in app/page.tsx
src/components/lfg/      LFG page UI (LfgHero, LfgToolbar, LfgTeamCard, SortDropdown, LfgPagination)
src/data/                static content (nav links, games, features, stats, footer links)
src/data/lfg-*.ts        LFG mock data (teams, ranks, roles)
public/games/            game cover images (landing page)
public/lfg/covers/       LFG team cover images
public/lfg/avatars/      LFG member avatar images
public/icons/            SVG/PNG icons
```

Keep copy/links/content in `src/data/*.ts`, not inline in JSX — makes it
editable without touching component code.

## Mock data → real backend

Data files under `src/data/` that represent things a database will
eventually own (e.g. `lfg-teams.ts`) are typed and shaped like the API
response they're standing in for — components consume the typed interface,
not the mock array directly. When the backend exists, swap the data source
(fetch/DB call) behind that same interface; components shouldn't need to
change.

## Scripts

```bash
npm run dev     # dev server, localhost:3000
npm run build
npm run lint
```

## Design source

Built from Figma file `CQg1F1t0GJh5BmiDacwNvC`:
https://www.figma.com/design/CQg1F1t0GJh5BmiDacwNvC/Design-System--Copy-

Despite the name, this file holds both the UI designs and the thesis
UML diagrams. Append `?node-id=<id>` to the URL to jump to one:

The file has three pages: **UI/UX** (screen designs), **Diagram** (thesis
UML), and Wireframe. Screen frames are 1440-wide, laid left to right.

| Node | What |
| --- | --- |
| `110:519` | LFG Page — the UI design the LFG route is built from |
| `2136:23` | Sign Up Page — matches `/signup` |
| `2151:64` | Log In Page — matches `/login` |
| `2148:64` | **Auth / Components** section (see below) |
| `1:2` | Kerangka Berpikir (research framework; vector, readable as text) |
| `37:6` | Use Case diagram |
| `40:16` | Use Case descriptions |
| `31:4` | Flowchart: recommendation + filter algorithm |
| `59:5` | Activity diagrams (3) |
| `79:5` | Sequence diagrams (3) |
| `168:3` | Class diagram |

Most diagram sections are rasterized images, so they need to be viewed
rather than parsed. They're the best available source for the figures
that the proposal PDF only contains as pictures.

### Figma components and variables

The auth screens are assembled from real components, not loose frames —
reuse them instead of drawing new ones:

| Component set | Variants | Code counterpart |
| --- | --- | --- |
| `Auth / Input Field` | `Trailing` = None / Eye / Chevron | `AuthField`, `AuthSelect` |
| `Auth / OAuth Button` | `Provider` = Google / Discord | `OAuthButtons` |
| `Auth / Step Card` | `State` = Active / Default | `AuthPanelCards` |
| `Auth / Primary Button` | — | submit buttons |

A **`TemanGame`** variable collection holds the colour tokens, mirroring
`@theme` in `globals.css` (`color/brand`, `color/bg-page`,
`color/text-muted`, `color/auth-*`, …). Bind fills to these rather than
typing hex values, and keep the two in sync when either side changes.

Note: Figma virtualises hidden sublayers inside instances, so an icon
that is invisible in a component will not exist in its instances at all.
That's why the input field uses `Trailing` variants rather than one
component with toggled icons.
