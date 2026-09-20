# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Aurora Supply Co. — a catalogue storefront. Committed JSON, no database.

## Commands

| Task | Command |
| --- | --- |
| Dev server | `npm run dev` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| All tests | `npm test` |
| One test | `npx playwright test -g "the root lists every category"` |
| First-time test setup | `npx playwright install chromium` |

`npm test` builds and serves on port 3100 itself — do not start a dev server first.

## Architecture

- `data/catalogue.json` is the only source of product data. No database, no fetching at build time.
- `lib/catalogue.ts` runs `assertCatalogue()` **at import time**, so malformed JSON fails the build
  rather than rendering broken pages. Read data only through `getCategories`,
  `getCategoryBySlug`, `getItemBySku` — never import the JSON directly.
- Pages are server components. `ConvertedPrice` is the only client component; it exists because a
  server component cannot fetch its own route handler without an absolute URL.
- `app/page.tsx` is the categories index. It lists every category as a card linking to that
  category's list page.
- Route segments each own `loading.tsx`, `error.tsx` and `not-found.tsx`. Adding a segment means
  adding all three.

## Data shape

A category: `slug` (kebab-case, unique), `name`, `blurb`, `items`.

An item: `sku` (unique across the whole catalogue), `name`, `blurb`, `description`,
`priceEur` (number), `currency` (always `"EUR"`), `inStock` (boolean), `addedOn` (ISO
`YYYY-MM-DD`), and `image` with `src`, `alt`, `width`, `height`.

Every field is required. Adding one means updating the types in `lib/catalogue.ts` and
`assertCatalogue` in the same change.

## Rules

- Money renders only through `formatMoney()`. No `toFixed`, no `Intl.NumberFormat`, no currency
  symbols — the house format is `12.50 EUR`.
- Dates render only through `formatDate()`. No `toLocaleDateString`, no `Intl.DateTimeFormat` —
  the house format is `15 Sep 2026`. `addedOn` stays ISO in the JSON.
- Every page renders `<PageHeader>`. No page writes its own `<h1>` or heading markup.
- Every list renders a real empty state with guidance, not a bare "no results".
- Outbound HTTP happens in `app/api/*/route.ts` only, with `AbortSignal.timeout(5000)`, and
  returns `{ error: { code, message } }` on failure. Codes are `MISSING_CONFIG`,
  `UPSTREAM_TIMEOUT`, `UPSTREAM_ERROR`, `BAD_REQUEST`.
- A route handler never puts a key or an upstream URL in a response body.
- Images use `next/image` with an `alt` and explicit `width` and `height`. Decorative images use
  `alt=""`; nothing else may omit it.
- `useEffect` must not call `setState` synchronously in its body — `react-hooks/set-state-in-effect`
  is an error, not a warning. Set state in the promise callback instead.

## What NOT to do

- No new dependencies without asking. The runtime dependencies are `next`, `react`, `react-dom`
  and nothing else.
- Do not upgrade ESLint past 9.x. `eslint-config-next` bundles an `eslint-plugin-react` that
  crashes on the ESLint 10 rule API.
- Do not use `next lint` — it was removed in Next 16. The lint script is `eslint .`.
- Do not reformat files the task did not need to touch.
- Do not commit directly to `main`. Every change arrives on a branch and merges with `--no-ff`.

## Secrets

- `EXCHANGE_RATE_API_KEY` — exchangerate-api.com, read only in `app/api/rates/route.ts`.
- `CONTEXT7_API_KEY` — the Context7 MCP server. Not used by the app at runtime.
- Both live in `.env`, which is gitignored. `.env.example` is the committed list of names and
  carries placeholder values only.
- No variable is ever prefixed `NEXT_PUBLIC_`. That prefix inlines the value into the browser
  bundle, which would publish the key.
- Never read a key outside a route handler, and never log one.

## Definition of done

A change is not done until all of these pass:

1. `npm run typecheck` — zero errors.
2. `npm run lint` — zero errors.
3. `npm run build` — succeeds.
4. `npm test` — all Playwright tests pass, and a new page or state has a test covering it.
5. The `site-reviewer` subagent has been run and reports no BLOCKING findings.
6. The change has been seen rendering in a browser, not just asserted in a test.

Run the reviewer before saying a task is complete, without being asked.
