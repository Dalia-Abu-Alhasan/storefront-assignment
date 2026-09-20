---
name: house-style
description: Aurora Supply Co.'s non-default UI and data conventions — page header block, four list states, date format, money format, external-call error envelope, and image alt/dimensions. Load before writing or editing any page, layout segment, list, formatted date or price, route handler that calls out, or <Image>. Fires even when the user's request doesn't name these rules — e.g. "add a page", "show the items", "call this API", "add an image".
---

# House style

Aurora Supply Co. is a catalogue storefront (`data/catalogue.json`, no database). These six rules
are non-default — nothing in Next.js or React gives them to you for free — so encode them here
instead of re-explaining them every time a page gets touched. Full rationale and examples for each
rule live in `references/rules.md`; read it before implementing whichever rule applies to the task
at hand.

If a page or component violates one of these rules, fix it. If a rule turns out to be wrong or
incomplete for a case you hit, fix this skill (and `references/rules.md`) rather than working around
it silently.

## The six rules, in one line each

1. **Page header** — every page, including error/not-found/loading pages, opens with
   `<PageHeader eyebrow title subtitle />` from `components/PageHeader.tsx`. No page writes its own
   `<h1>`. Building a new header-like block? Start from `assets/PageHeader.template.tsx`, don't
   invent new heading markup.
2. **Four states on lists** — every list has a loading state (skeletons, never a bare spinner), an
   empty state (via `<StateMessage tone="empty">` that tells the reader what to do next), an error
   state (`tone="error"`, says what failed, offers retry), and a success state. Route segments get
   this from `loading.tsx` / `error.tsx` / the empty-array branch in `page.tsx`.
3. **Dates** — render only through `formatDate()` from `lib/format.ts` → `15 Sep 2026`. Never
   `toLocaleDateString`, `Intl.DateTimeFormat`, ordinals, slashes, or full month names. `addedOn`
   stays ISO (`YYYY-MM-DD`) in the JSON; only the rendered output changes.
4. **Money** — render only through `formatMoney()` from `lib/format.ts` → `12.50 EUR`. Never
   `toFixed`, `Intl.NumberFormat`, or a currency symbol.
5. **External calls** — only inside `app/api/*/route.ts`, with `AbortSignal.timeout(5000)`. Every
   failure path returns `{ "error": { "code": "...", "message": "..." } }` with one of
   `MISSING_CONFIG` / `UPSTREAM_TIMEOUT` / `UPSTREAM_ERROR` / `BAD_REQUEST`. Never leak an upstream
   URL or key in the response body. Client components read the app's own route handler, never the
   upstream API directly — see `components/ConvertedPrice.tsx`.
6. **Images** — `next/image` always, always with explicit `width`/`height`, always with `alt`.
   Decorative images get `alt=""`; every other image gets real descriptive alt text. Never render a
   raw external URL as an `<img>` without dimensions.

See `references/rules.md` for the full explanation, the reasoning behind each rule, and worked
good/bad examples.
