# Categories Index At The Site Root

| | |
|---|---|
| **Slug** | `categories-index` |
| **Branch** | `claude/feature/categories-index` |
| **Status** | Draft |
| **Created** | 2026-09-20 |

## 1. Summary

The site root currently redirects to the first category in the catalogue, a placeholder chosen when
only one category existed. The catalogue now holds three. This replaces the redirect with a real
index page that lists every category, so a visitor arriving at the root sees the whole shop rather
than being dropped into one arbitrary corner of it.

## 2. Problem

`/` is not a page. It reads the catalogue, takes the first category, and redirects. That was a
deliberate stopgap documented in the code itself and in the project rules, on the understanding that
a categories index replaces it once there is more than one category.

That moment has arrived: the catalogue holds Desk Tools, Board games and Lighting. Three
consequences follow from leaving the redirect in place:

- A visitor landing on the root sees Desk Tools and has no way to learn that Board games and
  Lighting exist. There is no navigation anywhere in the shell — the masthead is a plain wordmark,
  not a link, and no page lists its siblings.
- Which category a visitor lands on is decided by array order in a JSON file. Reordering the
  catalogue silently changes the front door.
- The not-found states for both the root and an unknown category offer "Go to <first category>" as
  the only way back, because there is nowhere better to send someone. Recovery pushes the reader
  into the same arbitrary corner.

## 3. Goals and non-goals

**Goals**

- A visitor arriving at the root can see every category in the catalogue and choose one.
- Each category is presented with enough context — its name, its blurb, how much is in it — that
  the choice is informed rather than a guess.
- Every recovery path in the site (root not-found, category not-found) can send a lost reader
  somewhere neutral and useful instead of to an arbitrary first category.
- The root behaves like every other page in the site: house header, house states, the same visual
  language as the category listing.
- The catalogue remains the single source of truth — adding a category to the JSON makes it appear
  on the index with no other change.

**Non-goals**

- No site-wide navigation bar, breadcrumb trail, or masthead links. The masthead stays a wordmark.
  Cross-category movement via a persistent nav is a separate, larger change.
- No search, filtering, or sorting controls on the index. Categories are shown in catalogue order.
- No pagination. The catalogue is small and committed; paging is addressed under section 11 as a
  future threshold, not built now.
- No change to the category page, the item page, the rates route, or the catalogue data shape.
- No new fields on the category record. The index is built entirely from `slug`, `name`, `blurb`
  and the length of `items`.
- No category imagery. There is no category-level image in the data shape and this change does not
  add one.
- No redirect preserved at `/`. The root becomes the index; nothing else is routed to it.

## 4. User stories

- As a first-time visitor, I want to see what kinds of things this shop sells, so that I can decide
  where to start without guessing at URLs.
- As a returning visitor, I want to reach a category other than the default one from the front page,
  so that I do not have to remember or retype its address.
- As a visitor who followed a stale link, I want the not-found page to offer me the full list of
  categories, so that I can recover to the right place rather than a random one.
- As a content editor adding a category to the catalogue, I want it to appear on the index
  automatically, so that the front page never lies about what the shop stocks.

## 5. User experience

**Entry point** — The site root, `/`. This is the address a visitor reaches by typing the domain,
by following an external link to the shop, or by clicking the recovery action on a not-found page.
It is also where the wordmark would lead if the masthead were ever made a link, which this change
does not do.

**Main flow**

1. A visitor opens the root address.
2. The page header identifies the site and states how many categories are on offer.
3. Below the header, every category in the catalogue appears as a card in a grid, in catalogue
   order — the same grid treatment the category page uses for its items, so the two pages read as
   one system.
4. Each card shows the category name, its blurb, and a count of how many items it holds, with the
   count worded singular or plural as appropriate.
5. The visitor activates a card and arrives at that category's listing page, which is unchanged.

**States**

| State | Behaviour |
|---|---|
| Loading | The house header appears immediately with a loading title and subtitle, followed by a grid of placeholder skeleton cards matching the shape of the real ones. This matches the treatment the category segment already uses. In practice the data is read at build time and this state is rarely seen, but the segment owns it. |
| Empty | Cannot occur through the catalogue's own validation, which rejects an empty `categories` array at import time — the build fails before a page renders. The page still renders a real empty state with guidance rather than a bare message, so that the rule holds without depending on the validator. |
| Error | The house header appears with an error title, followed by an error-toned state message explaining that the catalogue did not load, with guidance that this is usually temporary and a control to retry. Mirrors the existing root and category error states. |
| Success | The header plus the full grid of category cards, as described in the main flow. |

**Interaction details**

- Ordering is catalogue order. No sort control, and no alphabetisation — the order in the JSON is
  the editorial order and stays meaningful.
- The whole card is the target, not just the name, matching how item cards behave.
- There is no destructive action, no form, and nothing to cancel. Nothing persists across
  navigation; the page holds no client state.
- Navigating away and back re-renders from the same committed data, so the page is identical.
- The root not-found and the category not-found currently offer "Go to <first category>". Both
  change to offer the categories index instead, since a neutral list is a better recovery
  destination than one arbitrary category.

**Accessibility**

- The category list is a real list, so assistive technology announces its length. Each card's
  heading sits at the level below the page `h1`, matching the item card convention.
- Each card's accessible name resolves to the category name; the count and blurb are readable
  supporting text, not the only distinguishing content.
- The loading grid is marked busy and labelled, as the category loading state already is.
- Nothing is conveyed by colour alone. The item count is text.

## 6. Interface contract

None. This is a server-rendered page reading committed catalogue data through the existing
accessors. There is no client/server boundary, no request at render time, no route handler, and no
new endpoint. The only outbound call in the app, the rates route, is not touched.

## 7. Data model

**New or changed records**

None. The index is derived entirely from the existing category record.

| Field | Type | Required | Constraints / default |
|---|---|---|---|
| `slug` | string | Yes | Existing field. Kebab-case, unique. Used to build the link target. |
| `name` | string | Yes | Existing field. Non-empty. The card's heading. |
| `blurb` | string | Yes | Existing field. Non-empty. The card's supporting line. |
| `items` | array | Yes | Existing field. Its length supplies the item count. Not otherwise read. |

**Access patterns** — One question only: what are all the categories, in catalogue order, with
their name, blurb, slug and item count? The existing accessor that returns every category answers
it directly. No lookup by key, no filter, no join. No new accessor is needed, and nothing may read
the JSON directly.

**Migration impact** — None. No schema change, no persisted data, no migration, nothing to
backfill. The change is fully reversible by restoring the redirect.

**Retention and growth** — The catalogue is a committed JSON file edited by hand, so it grows only
when someone adds a category in a change. There is no unbounded growth, nothing to archive, and
nothing to expire. See section 11 for the point at which the page's own length becomes the concern.

## 8. Validation rules

No user input reaches this feature, so there is nothing to validate at request time. The rules that
apply are the existing import-time catalogue assertions, which run before any page renders and fail
the build rather than rendering something broken. They are listed here because the index depends on
them holding.

| Rule | Message | Enforced |
|---|---|---|
| The catalogue contains at least one category | The existing invalid-catalogue build error naming the root | Server, at import time |
| Every category has a non-empty name and blurb | The existing invalid-catalogue build error naming the category | Server, at import time |
| Every category slug is kebab-case and unique | The existing invalid-catalogue build error naming the category | Server, at import time |
| A category's items is an array | The existing invalid-catalogue build error naming the category | Server, at import time |

## 9. Background and scheduled work

None. Nothing recurring, deferred, retried or scheduled. The page is static, generated from
committed data at build time.

## 10. Security and access

The catalogue is a public product listing and the index is open to anyone who can reach the app,
exactly as the category and item pages already are. There is no authentication anywhere in the site
and this change does not introduce any.

- No secret is read, referenced or rendered. This page runs no outbound call, so no key is in
  scope — the exchange-rate key stays confined to its route handler.
- No user input reaches a query, a file path, a shell, or rendered output. There are no route
  parameters on the root; every value rendered comes from committed data.
- The only values placed in a link are existing category slugs, already constrained to kebab-case
  by the catalogue validator.
- Nothing is logged.

## 11. Performance and scale

The catalogue currently holds three categories and twelve items in a file of a few kilobytes,
committed to the repository. The page reads it once at build time and renders static output; there
is no per-request work, no I/O and no fetching.

- Cost grows linearly with the number of categories, and reading item counts adds no traversal
  beyond the array lengths already in memory — the items themselves are not read.
- The response is a small static document with no images, so it is smaller than the category
  listing it links to.
- No environment ceiling is in reach: no function duration, no request size, no memory pressure.
  The whole catalogue is already loaded into the module at import time regardless of this page.
- The practical ceiling is editorial, not technical. Somewhere past roughly thirty categories a
  single ungrouped grid stops being scannable and the page would want grouping or paging. That is
  well beyond the current catalogue and is recorded in section 15 rather than built now.

## 12. Testing

The project's test layer is Playwright, run against a real build served on its own port. There is
no unit test runner and no component test harness in the repository, so those layers are noted as
absent rather than invented.

**Integration**

- The root address renders the index page and no longer redirects. The existing test asserting that
  the root redirects to the seeded category must be replaced, not merely added to — it will fail
  otherwise, and its failure is the point.
- The root renders the house header: an eyebrow, a level-one heading, and a non-empty subtitle.
- The index lists exactly as many category cards as the catalogue holds, and their names match the
  catalogue's categories in catalogue order.
- Each card shows an item count matching the number of items in that category.
- Activating a category card navigates to that category's listing page, and that page renders its
  own header for the expected category.
- The root produces no console errors while rendering.
- The root not-found state offers a recovery action leading to the index, and following it arrives
  at the index.
- An unknown category's not-found state offers a recovery action leading to the index.
- The existing category, item, not-found and rates tests continue to pass unchanged.

**Unit** — None. There is no unit test layer in this project, and this change adds no logic worth
isolating from I/O: the page reads an existing accessor and renders.

**Frontend** — None as a separate layer; there is no component test harness. The page is a server
component with no client state, and its behaviour is covered end to end above.

**Manual**

- The index has been seen rendering in a browser, not only asserted in a test, as the project's
  definition of done requires.
- The card grid holds together at a narrow viewport as well as a wide one, and the categories page
  and a category listing read as the same system rather than two different designs.
- Category blurbs of differing lengths do not leave the cards visibly ragged.

## 13. Acceptance criteria

- [ ] `/` renders a page and issues no redirect.
- [ ] Every category in the catalogue appears on the index, in catalogue order.
- [ ] Each category entry shows its name, its blurb, and its item count, with the count worded
      singular or plural correctly.
- [ ] Each category entry links to that category's listing page and arrives there.
- [ ] The page renders the house page header component; it writes no heading markup of its own.
- [ ] The root segment owns a loading state, an error state and a not-found state, each rendering
      the house header and a real state message with guidance rather than a bare label.
- [ ] The index renders a real empty state with guidance if the catalogue were ever to hold no
      categories.
- [ ] The root not-found recovery action leads to the index rather than to an arbitrary category.
- [ ] The unknown-category not-found recovery action leads to the index rather than to an arbitrary
      category.
- [ ] Category data is read only through the existing catalogue accessors; the JSON is not imported
      directly and no new accessor duplicates one that exists.
- [ ] No money and no date is rendered on this page; if either is ever added, it goes through the
      house formatters.
- [ ] No new runtime dependency is added.
- [ ] `npm run typecheck` reports zero errors.
- [ ] `npm run lint` reports zero errors.
- [ ] `npm run build` succeeds.
- [ ] `npm test` passes in full, including a replacement for the root-redirect test and new
      coverage for the index page and its states.
- [ ] The `site-reviewer` subagent has been run and reports no blocking findings.
- [ ] The page has been seen rendering in a browser.

## 14. Open questions

| Question | Options | Owner |
|---|---|---|
| Does the root keep a `loading.tsx`? The segment rule says every segment owns all three state files, but the root currently has only an error and a not-found state, and the data is read at build time so the loading state is near-unreachable. | Add it for consistency with the rule; or document the root as an exception | Project owner |
| Should the item count be worded as a plain count, or as stock-aware wording such as how many items are in stock? | Plain count of items, matching the category page's own subtitle wording; or in-stock count, which is more useful but diverges from the category page and adds a second number to keep consistent | Project owner |
| Should a category with zero items appear on the index, be marked as empty, or be hidden? | Show it plainly with a zero count; show it with an explicit "nothing in stock yet" treatment; or omit it. The catalogue permits an empty items array, so this is reachable. | Project owner |
| Should the masthead wordmark become a link to the index now that the root is a real page? | Yes, it is the conventional affordance and costs almost nothing; or no, it is navigation and navigation is explicitly out of scope for this change | Project owner |
| What eyebrow does the index header use? | "Catalogue"; "Categories"; or the site name. The category page uses "Category" and the item page uses the category name, so the index needs a word that sits above both. | Project owner |

## 15. Out of scope and follow-ups

- Site-wide navigation: a masthead that links home, and a way to move between categories without
  returning to the index.
- A breadcrumb trail on the category and item pages, which becomes coherent only once the root is a
  real page.
- Grouping, sorting or paging the index, should the catalogue grow past the point where a single
  grid is scannable.
- Category-level imagery, which would require a new field on the category record and therefore a
  change to the data shape, the types and the validator together.
- Surfacing a few representative items, or an in-stock count, on each category card.
- Search across the whole catalogue, which the index is the natural home for but which is a
  substantially larger feature.
