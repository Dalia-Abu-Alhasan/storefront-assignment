# Aurora Supply Co.

A small catalogue storefront: a categories index, category list pages, item detail pages, and one
server-side currency conversion. Built as the vertical slice for the AI coding agents assignment.

## Stack

Next.js 16.3.5 (App Router) · React 19.3.0 · TypeScript 5.9.3 (strict) · Tailwind CSS 4.3.3 ·
Playwright 1.63.0. Node 22 or newer. No database — the catalogue is committed JSON.

## Running it

```
npm install
npx playwright install chromium
cp .env.example .env     # then fill in real values
npm run dev
```

The site opens at `http://localhost:3000`, the categories index.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit`, zero errors expected |
| `npm run lint` | ESLint over the whole project |
| `npm test` | Playwright smoke tests against a production build |

## Environment variables

Both live in `.env`, which is never committed. `.env.example` is the committed list of names.

| Variable | Used by | Notes |
| --- | --- | --- |
| `EXCHANGE_RATE_API_KEY` | `app/api/rates/route.ts` | exchangerate-api.com. Server-side only. |
| `CONTEXT7_API_KEY` | Context7 MCP server | Not used by the app at runtime. |

Neither is prefixed `NEXT_PUBLIC_`, so neither reaches the browser bundle. Without a real
`EXCHANGE_RATE_API_KEY` the rates route returns `MISSING_CONFIG` and the detail page falls back to
showing the EUR price only.

## Layout

```
app/
  page.tsx                  categories index
  loading.tsx               index loading state
  category/[slug]/          list page + loading, error, not-found
  item/[sku]/               detail page + loading, error, not-found
  api/rates/route.ts        the one external call
components/                 PageHeader, CategoryCard, ItemCard, StateMessage, ConvertedPrice
lib/catalogue.ts            types, runtime validator, accessors
lib/format.ts               formatDate, formatMoney — the only formatters
data/catalogue.json         the catalogue
tests/smoke.spec.ts         Playwright smoke tests
```

## House style

Six conventions hold across every page. Their detailed home is the house-style skill; in short:

1. Every page renders `<PageHeader>` — uppercase eyebrow, `h1`, muted subtitle.
2. Four states everywhere data is involved: loading, empty (with guidance), error (with retry),
   success.
3. Dates render as `15 Sep 2026`, only via `formatDate`.
4. Money renders as `12.50 EUR`, only via `formatMoney`.
5. External calls live in route handlers, with a five-second timeout and the standard error
   envelope `{ error: { code, message } }`.
6. Images always carry `alt` and explicit `width` and `height`.
