# TemanGame — Agent Notes

Frontend only, for now.

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

Built from Figma: https://www.figma.com/design/CQg1F1t0GJh5BmiDacwNvC/Design-System--Copy-
