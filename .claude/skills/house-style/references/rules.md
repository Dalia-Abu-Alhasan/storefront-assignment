# House style — detailed rules

## 1. Page header block

Every page — including error pages, not-found pages, and loading skeletons — opens with the same
three-part block: an uppercase, letter-spaced eyebrow naming the section, an `<h1>`, and one muted
descriptive sentence underneath. No page writes its own heading markup; they all render
`<PageHeader>` from `components/PageHeader.tsx`:

```tsx
<PageHeader
  eyebrow="Category"
  title={category.name}
  subtitle={`${category.blurb} ${count} items in this category.`}
/>
```

Loading states still show the header shape — as skeleton blocks matching the eyebrow/title/subtitle
layout (see `app/category/[slug]/loading.tsx`) — so the page doesn't jump when real content arrives.
Error and not-found pages pass a header that describes *that* state (`title="This category could
not be loaded"`), not the page's normal title.

**Why:** a consistent header is the one piece of chrome that tells the reader where they are on
every single screen, including the screens that go wrong. Letting each page invent its own heading
markup fragments that immediately.

**Bad:** `<h1>{category.name}</h1>` written directly in a page component.
**Good:** `<PageHeader eyebrow="Category" title={category.name} subtitle={...} />`.

## 2. Four states on lists

Any list of data (categories, items, search results) must implement all four states:

- **Loading** — skeleton blocks shaped like the eventual content (`skeleton skeleton--card`, etc).
  A bare spinner with no shape is a defect, not a placeholder.
- **Empty** — `<StateMessage tone="empty" title="..." guidance="...">`. The `guidance` line must
  tell the reader what to do next ("Try another category, or check back next week"), not just state
  that there's nothing here.
- **Error** — `<StateMessage tone="error" title="..." guidance="...">` plus a retry action. Says
  what failed and offers a way to recover, never just "Something went wrong."
- **Success** — the actual list, rendered as a real `<ul className="grid">` of cards/rows.

`StateMessage` (`components/StateMessage.tsx`) is the shared shape for the three non-success states;
reuse it rather than writing bespoke empty/error markup per page.

**Why:** users hitting an empty category or a failed fetch need to know what happened and what to do
about it. A bare spinner or a silent empty `<ul>` gives them neither.

## 3. Date formatting

Dates render only through `formatDate()` in `lib/format.ts`:

```ts
formatDate("2026-09-15") // → "15 Sep 2026"
```

Two-digit day, three-letter month abbreviation, four-digit year, space-separated. No ordinals
("15th"), no slashes ("15/09/2026"), no full month names ("September"). If a time is ever rendered,
it uses 24-hour format — no "3:00 PM".

`addedOn` and any other stored date stays ISO (`YYYY-MM-DD`) in `data/catalogue.json`; only the
*rendered* string changes shape. Never call `toLocaleDateString()` or `Intl.DateTimeFormat()` —
those shift with the server's locale and timezone, which breaks the fixed house format.

**Why:** a locale-dependent date format means the same product page renders differently depending on
where the server happens to be running. The house format is deliberately fixed and hand-rolled so it
never drifts.

## 4. Money formatting

Money renders only through `formatMoney()` in `lib/format.ts`:

```ts
formatMoney(12.5, "EUR") // → "12.50 EUR"
```

Exactly two decimal places, one space, then the three-letter ISO currency code. Never a currency
symbol (`€`, `$`), never `toFixed()` called directly in a component, never `Intl.NumberFormat`.

**Why:** currency symbols are ambiguous across locales (`$` alone doesn't say which dollar), and
`Intl.NumberFormat`/`toFixed` both introduce locale- or precision-dependent formatting that isn't the
fixed house style.

## 5. External calls

All outbound HTTP happens inside `app/api/*/route.ts` route handlers — never in a server component,
never in a client component. Every such call:

- Uses `AbortSignal.timeout(5000)`.
- Wraps the fetch in try/catch and distinguishes a timeout (`DOMException` named `"TimeoutError"`)
  from any other failure.
- On any failure, returns `{ "error": { "code": ErrorCode, "message": string } }` with an
  appropriate HTTP status. `ErrorCode` is one of `MISSING_CONFIG`, `UPSTREAM_TIMEOUT`,
  `UPSTREAM_ERROR`, `BAD_REQUEST` — see `lib/rates.ts` for the shared type and
  `app/api/rates/route.ts` for the reference implementation.
- Never puts the upstream URL or the API key in the response body, in a log line, or in an error
  message shown to the user.

Client components that need this data (e.g. `components/ConvertedPrice.tsx`) call the app's *own*
route handler (`/api/rates`), never the upstream service directly — the browser never sees the
upstream URL or the key.

**Why:** route handlers are the only place a secret can be read server-side and never reach the
client bundle; centralizing the five-second timeout and the error envelope means every upstream
failure degrades the same predictable way instead of each caller inventing its own error shape.

## 6. Images

Every image uses `next/image`, with `alt` and explicit `width`/`height` always present —
`next/image` requires the dimensions anyway, but never omit them by falling back to a raw `<img>`.

- Decorative images (that convey no information beyond what's already stated in text) get
  `alt=""`.
- Every other image gets real, specific alt text — not the filename, not "image of product".
- Never render an external image URL directly (`<img src={url}>`) without going through
  `next/image` with explicit dimensions; an un-sized image causes layout shift.

**Why:** missing alt text breaks screen readers; missing dimensions cause layout shift as images
load. Both are silent failures that only show up in an accessibility or performance audit, not in a
quick visual check — so this skill enforces them up front instead.
