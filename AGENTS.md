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
src/components/          reusable UI (Navbar, Footer, Logo, GameCard, FeatureCard)
src/components/sections/ page sections (Hero, Features, Stats) — composed in app/page.tsx
src/data/                static content (nav links, games, features, stats, footer links)
public/games/            game cover images
public/icons/            SVG icons
```

Keep copy/links/content in `src/data/*.ts`, not inline in JSX — makes it
editable without touching component code.

## Scripts

```bash
npm run dev     # dev server, localhost:3000
npm run build
npm run lint
```

## Design source

Built from Figma: https://www.figma.com/design/CQg1F1t0GJh5BmiDacwNvC/Design-System--Copy-
