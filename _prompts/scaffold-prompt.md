Written by: GPT-5.6 Luna (ChatGPT web); returned unchanged.
Rounds: 1

---

# Scaffold prompt — Aurora Supply Co. storefront

Scaffold a building, running vertical slice of a small storefront into the **empty folder** you are
in. Write every file in full — no TODOs, no placeholders, no "rest of the file unchanged".

Scope is deliberately narrow: **one category, four items, a list page, a detail page, and one
external API call working locally. Nothing more.** No cart, no search, no second category, no
admin. Later work adds those; do not anticipate it.

## Step 1 — do this before writing any file

```
git init -b main
```

Do not commit yet. The single initial commit comes at the end, only when every check in the
Definition of done passes.

## Pinned versions — exactly these

| Package | Version |
| --- | --- |
| next | 16.3.5 |
| react | 19.3.0 |
| react-dom | 19.3.0 |
| typescript | 5.9.3 |
| @types/node | ^22 |
| @types/react | ^19 |
| @types/react-dom | ^19 |
| tailwindcss | 4.3.3 |
| @tailwindcss/postcss | 4.3.3 |
| eslint | 10.11.0 |
| eslint-config-next | 16.3.5 |
| @playwright/test | 1.63.0 |

Node 22.x, declared as `"engines": { "node": ">=22.0.0" }`.

Next.js **App Router**, TypeScript **strict**, Tailwind CSS **v4** (CSS-first: `@import
"tailwindcss"` in the global stylesheet; no `tailwind.config.js` unless a theme block genuinely
needs one). No other runtime dependencies — no database, ORM, CMS, auth library or state library.

## Folder layout

```
app/
  layout.tsx
  page.tsx                  redirect to the seeded category
  globals.css
  category/[slug]/
    page.tsx                LIST PAGE
    loading.tsx
    error.tsx
    not-found.tsx
  item/[sku]/
    page.tsx                DETAIL PAGE
    loading.tsx
    error.tsx
    not-found.tsx
  api/rates/route.ts        THE EXTERNAL CALL
components/
  PageHeader.tsx
  ItemCard.tsx
  StateMessage.tsx          shared empty / error presentation
lib/
  catalogue.ts              types, validator, accessors
  format.ts                 formatDate, formatMoney
data/
  catalogue.json            the seed data
public/images/placeholder.svg
tests/smoke.spec.ts
```

`app/page.tsx` is a redirect, not a page — the categories index is intentionally out of scope.

## Data shape

`data/catalogue.json` holds an array of categories, each holding an array of items. Seed exactly
**one** category with **four** items.

```json
{
  "categories": [
    {
      "slug": "desk-tools",
      "name": "Desk Tools",
      "blurb": "One line, shown under the category heading.",
      "items": [
        {
          "sku": "DT-0001",
          "name": "Machined Aluminium Ruler",
          "blurb": "Short summary for the card.",
          "description": "Two or three sentences for the detail page.",
          "priceEur": 24.5,
          "currency": "EUR",
          "inStock": true,
          "addedOn": "2026-09-15",
          "image": {
            "src": "/images/placeholder.svg",
            "alt": "Machined aluminium ruler on a plain background",
            "width": 800,
            "height": 600
          }
        }
      ]
    }
  ]
}
```

Required of the data:

- `sku` unique across the whole catalogue; `slug` unique and kebab-case.
- `priceEur` is a number in euros; `currency` is always the ISO code `"EUR"`.
- `addedOn` is ISO `YYYY-MM-DD` in the file, and is only ever *displayed* in the house format.
- Every item carries a full `image` object: non-empty `alt`, explicit `width` and `height`.
- The four items vary in price and in `inStock`, so both states are visible.

`lib/catalogue.ts` exports the types `Item`, `Category`, `Catalogue`; a runtime validator
`assertCatalogue()` that throws a clear message naming the offending field if the JSON drifts; and
the accessors `getCategories()`, `getCategoryBySlug(slug)`, `getItemBySku(sku)`.

## The two pages

Both are server components. Both render `<PageHeader>`.

**List page — `/category/[slug]`.** Grid of item cards: image, name, blurb, formatted price, stock
badge; each links to its detail page. `notFound()` on an unknown slug. Renders a real empty state
when the category has no items.

**Detail page — `/item/[sku]`.** Image, name, description, formatted price, formatted `addedOn`,
stock state, and the converted price from the rates route. `notFound()` on an unknown sku.

## The external call

`app/api/rates/route.ts` — a GET handler that reads the exchangerate-api.com v6 endpoint for base
EUR and returns the rate for a target currency (`?to=USD`, default `USD`).

- The key comes from `process.env.EXCHANGE_RATE_API_KEY`, **server-side only**.
- It is **never** prefixed `NEXT_PUBLIC_` and never reaches the browser bundle.
- `AbortSignal.timeout(5000)` on the fetch.
- `next: { revalidate: 3600 }`, to stay inside the free tier.
- Missing key, upstream failure or timeout returns the error envelope with a sensible status. Never
  throw uncaught; never put the key or the upstream URL in the response body.

Success:

```json
{ "base": "EUR", "target": "USD", "rate": 1.0842, "fetchedOn": "2026-09-20" }
```

Failure — the standard envelope, used by every route handler:

```json
{ "error": { "code": "UPSTREAM_TIMEOUT", "message": "Safe to show a user." } }
```

Codes: `MISSING_CONFIG`, `UPSTREAM_TIMEOUT`, `UPSTREAM_ERROR`, `BAD_REQUEST`.

The detail page degrades gracefully to EUR-only when the rate is unavailable.

## House style — six rules, applied to both pages

These are the conventions the project will be held to. Apply them now; their permanent home is a
skill added after this scaffold.

1. **Page header** — uppercase letter-spaced eyebrow, `<h1>`, muted subtitle. One component,
   `PageHeader.tsx`, used by every page. No page writes its own heading markup.
2. **Four states** — loading, empty (with guidance on what to do), error (with retry), success.
   Real `loading.tsx` and `error.tsx` in each route segment.
3. **Dates** — `15 Sep 2026`. No ordinals, slashes or full month names. Only `formatDate()`.
4. **Money** — `12.50 EUR`. Two decimals, one space, ISO code, never a symbol. Only `formatMoney()`.
5. **External calls** — route handlers only, never in a page or client component; 5-second timeout;
   the error envelope above.
6. **Images** — always `alt` (empty only if decorative), always explicit `width` and `height`; use
   `next/image`.

`formatDate` and `formatMoney` live in `lib/format.ts` and are the only way dates and money are
rendered. No `toFixed`, `toLocaleDateString` or `Intl` call anywhere in `app/` or `components/`.

## Secrets

- `.env.example` — committed, placeholders only:

  ```
  EXCHANGE_RATE_API_KEY=your_exchangerate_api_key_here
  CONTEXT7_API_KEY=your_context7_api_key_here
  ```

- `.env` — created, never committed.
- `.gitignore` blocks `.env` and `.env*.local`, and lets `.env.example` back through with a
  negation.
- No real key value appears in any file, comment or example.

## Also produce

- `README.md` — what it is, how to run it, the scripts, the required variables by name.
- `public/images/placeholder.svg` — neutral 800x600 placeholder, used by all four items.
- `globals.css` — restrained design: neutral background, one accent colour, generous whitespace,
  readable type scale, dark mode via `prefers-color-scheme`.
- `tests/smoke.spec.ts` — Playwright: the list page renders with its header and four cards; a
  detail page renders with its header and a formatted price; no console errors on either.

## Scripts

```json
"dev": "next dev",
"build": "next build",
"start": "next start",
"typecheck": "tsc --noEmit",
"lint": "next lint",
"test": "playwright test"
```

## Definition of done

Run these in order. Fix anything that fails and run again. Do not commit until all pass.

1. `npm install`
2. `npx playwright install chromium`
3. `npm run typecheck` — zero errors
4. `npm run lint` — zero errors
5. `npm run build` — succeeds
6. `npm test` — all Playwright tests pass
7. `git check-ignore -v .env` — prints a matching rule
8. `git status` — `.env` untracked, `.env.example` tracked
9. No match for `NEXT_PUBLIC_` anywhere outside documentation
10. Both pages satisfy all six house-style rules

## Final step

Only once all ten pass:

```
git add .
git commit -m "chore: scaffold Aurora Supply Co. storefront vertical slice"
```

One commit, so the whole scaffold is reviewable as a single diff. Do not add a remote and do not
push. Then report: the commands you ran, their results, and anything you had to change to get
green.
