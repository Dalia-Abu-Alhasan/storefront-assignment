# Implement: Categories Index At The Site Root

Spec: `_specs/categories-index.md` (branch `claude/feature/categories-index`).

## Context

`app/page.tsx` is currently a placeholder redirect: it reads `getCategories()`, takes the first
entry, and `redirect()`s there. That was fine when the catalogue held one category; it now holds
three (Desk Tools, Board games, Lighting), so the redirect silently hides two-thirds of the shop and
makes array order in a JSON file the thing that decides a visitor's front door. This replaces the
redirect with a real index page listing every category as a card, and repoints the two recovery links
that currently say "Go to `<first category>`" at that index instead.

Two open questions from the spec are settled:
- **Eyebrow**: `"Categories"` — parallels the category page's `"Category"` eyebrow.
- **Zero-item category card**: gets an explicit "Nothing in stock yet" tag rather than a bare `0
  items` count. Not reachable with today's data (every category has 4 items) but the validator
  permits an empty `items` array, so the card shouldn't silently show `0 items`.

Everything else follows the spec's non-goals directly: no nav bar, no category imagery, no
sorting/paging, plain item count from `items.length`, masthead stays a wordmark.

**Before writing code:** load the `house-style` skill.

## Step 0 — persist this plan

Save this plan file verbatim to `_plans/categories-index.md` in the repo and commit it (e.g. `git add
_plans/ && git commit -m "plan: categories index implementation"`) before any code changes, so the
approved plan is preserved as-written alongside the spec it implements.

## Approach

Mirror the existing category page's structure one level up, reusing what already exists rather than
inventing new patterns:

| New/changed | Mirrors |
|---|---|
| `components/CategoryCard.tsx` (new) | `components/ItemCard.tsx` — same `card`/`card__link`/`card__body`/`card__name`/`card__blurb` classes, minus the `<Image>` (categories have no image field) and price/badge, plus an item-count line |
| `app/page.tsx` (rewritten) | `app/category/[slug]/page.tsx` — `PageHeader` + `getCategories()` + a `.grid` of cards, with a `StateMessage` empty branch |
| `app/loading.tsx` (new — root has none today) | `app/category/[slug]/loading.tsx` — real `PageHeader` with literal "Loading categories" title + skeleton `.grid` |
| `app/not-found.tsx`, `app/category/[slug]/not-found.tsx` (edited) | themselves, minus the `getCategories()`/`first` lookup — link becomes `href="/"`, label "Browse categories" |

`app/item/[sku]/not-found.tsx` has the same "Go to `<first category>`" pattern but is **left
unchanged** — the spec's goals/acceptance criteria only name the root and category not-found pages.
Flagging the inconsistency rather than silently expanding scope.

`app/globals.css` gets two small additions: `.card__count` (styled like `.card__price` but muted,
alongside it in the "grid and cards" section) and `.skeleton--card-compact` (shorter than
`.skeleton--card` since an imageless category card is shorter — alongside it in the "loading
skeletons" section).

`CLAUDE.md`'s documented test example (`npx playwright test -g "the root redirects"`) targets a test
being renamed below; update that one line so the doc stays accurate.

## Tests — `tests/smoke.spec.ts`

- Replace `"the root redirects to the seeded category"` with a test asserting: `/` renders (no
  redirect), the house header shows eyebrow "Categories", `.card` count is 3, card names match
  catalogue order (`Desk Tools`, `Board games`, `Lighting`), first card's count reads "4 items", no
  console errors.
- Add a test that clicking a category card from the index navigates to that category's page.
- Update the two existing not-found tests (root and category) to also click the recovery link and
  assert it lands on `/`, not just check the heading text as they do now.
- All other existing tests (category listing, item detail, unknown item, rates envelope) are
  unaffected and must keep passing unchanged.

## Verification

1. `npm run typecheck` — zero errors.
2. `npm run lint` — zero errors.
3. `npm run build` — succeeds.
4. `npm test` — full Playwright suite green, including the replaced/new tests above.
5. Run the `site-reviewer` subagent against the diff; resolve any BLOCKING findings.
6. Manual check in a browser: `/` shows three category cards with correct names/blurbs/counts;
   clicking one lands on that category; an unrouted path and an unknown category slug both show
   not-found states whose recovery link lands back on `/`.

## Implementation status (2026-09-20)

Everything above was implemented exactly as planned — no deviations from the approach table.

**Deviation from the spec, found by the site-reviewer:** the spec's acceptance criteria asked the
root loading state to render "a real state message with guidance", but the spec's own states table
specifies skeletons, and house-style rule 2 calls a bare message in place of skeletons a defect.
The implementation follows the states table and the house rule; the acceptance criterion is the
inconsistent artefact. Recorded rather than silently resolved.

**Post-review corrections:** the reviewer found no BLOCKING findings but flagged documentation that
the change had falsified — `CLAUDE.md` still described `app/page.tsx` as a redirect, and `README.md`
still described a one-category site with a redirecting root and no `CategoryCard`. Both corrected.
The index item-count assertion was widened from the first card to all three.

- `components/CategoryCard.tsx` — added.
- `app/page.tsx` — rewritten as the index (no more redirect).
- `app/loading.tsx` — added (root segment had none before).
- `app/not-found.tsx`, `app/category/[slug]/not-found.tsx` — recovery links repointed to `/`
  ("Browse categories"), `getCategories()`/`first` lookups removed.
- `app/item/[sku]/not-found.tsx` — left unchanged as planned (still links to the first category;
  out of the spec's stated scope).
- `app/globals.css` — added `.card__count` and `.skeleton--card-compact`.
- `CLAUDE.md` — updated the "one test" example to name a test that still exists.
- `tests/smoke.spec.ts` — replaced the root-redirect test, added a card-click-through test, updated
  both not-found tests to assert the recovery link lands on `/`.
- Masthead — left as a plain wordmark, no home link added, per the spec's explicit non-goal.

Verification results:
1. `npm run typecheck` — passed, zero errors.
2. `npm run lint` — passed, zero errors.
3. `npm run build` — succeeded; route table confirms `/` is now a static page (`○`), not a redirect.
4. `npm test` — all 8 Playwright tests passed, including the new/updated ones.
5. `site-reviewer` — no BLOCKING findings. One ADVISORY: `CategoryCard`'s empty-category tag reused
   `badge--out` (the item "out of stock" class), conflating two different meanings. Fixed: added a
   distinct `.badge--empty` rule in `app/globals.css` and switched the card to use it. Re-ran
   typecheck/lint/tests after the fix — all still pass.
6. Manual browser check — done against a production build (`npm run build && npm run start -- --port
   3100`) via the Playwright MCP browser: `/` renders the eyebrow, `h1`, subtitle, and all three
   category cards with correct names/blurbs/counts in catalogue order; clicking a card navigates to
   its category page; an unknown category slug and an unrouted path both show their not-found state,
   and clicking "Browse categories" from each lands back on `/`. The only console error observed
   (`favicon.ico` 404) is pre-existing and unrelated — no favicon file exists anywhere in the repo.
