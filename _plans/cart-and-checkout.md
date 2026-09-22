# Implementation Plan: Cart And Checkout

| | |
|---|---|
| **Slug** | `cart-and-checkout` |
| **Spec** | `_specs/cart-and-checkout.md` |
| **Branch** | `claude/feature/cart-and-checkout` |
| **Status** | In progress |
| **Created** | 2026-09-22 |
| **Updated** | 2026-09-22 |

## How to resume this plan

1. Read the spec linked above for the *why*. This plan covers only the *how*.
2. Find the first phase in **Progress** below that is not `Done`.
3. Read that phase in full — its goal, prerequisites, tasks, technical details, and its
   "Done when" criteria — before changing any code.
4. Check **Decisions** before choosing an approach. Anything already settled there is not
   open for reconsideration without saying so.
5. As you work: tick each task, keep **Progress** current, and add a line to the
   **Session log**. A plan that is not updated as it goes is worse than no plan.
6. If reality contradicts the plan, correct the plan in place and record it under
   **Deviations**. Do not silently diverge.

## Overview

When this is finished, Aurora Supply Co. can be bought from. A visitor adds items to a cart from an
item's detail page, sees a running count in the masthead on every page, reviews and adjusts the cart
at `/cart`, supplies delivery details at `/checkout`, and lands on `/checkout/confirmation` with an
order reference and a summary.

The cart lives in the visitor's browser (`localStorage`), holding only `{ sku, quantity }`. One new
route handler, `POST /api/checkout`, re-reads the committed catalogue, re-checks availability and
recomputes the total in integer cents — nothing the client sends about price is trusted. Nothing is
persisted server-side, because there is nowhere to persist it: the catalogue is a committed JSON file
and the route handlers run as stateless functions.

Four new segments (`/cart`, `/checkout`, `/checkout/confirmation`, plus the API route), each with the
house page header and all four list states.

## Context

See spec.

## Progress

| Phase | Name | Status |
|---|---|---|
| 1 | Cart foundation | Done |
| 2 | The cart page | Not started |
| 3 | Checkout and the order handler | Not started |
| 4 | Confirmation, and closing out | Not started |

**Current state of the working tree** — Clean. Phase 1 is committed. `lib/checkout.ts`,
`lib/cart.ts`, `components/CartIndicator.tsx` and `components/AddToCart.tsx` are new;
`app/layout.tsx`, `app/item/[sku]/page.tsx`, `app/globals.css` and `tests/smoke.spec.ts` are
modified; `.claude/launch.json` was added so the dev server can be driven for the browser checks.
`main` is at `a60d90c` (the categories-index merge).

## Action required

| When | Action | Why it is needed |
|---|---|---|
| After phase 4 | Walk the whole flow in a real browser — add an item, change a quantity, remove a line, submit with a blank field, complete an order, reload the confirmation | CLAUDE.md's definition of done requires the change to have been seen rendering, not only asserted in a test. Only a person can confirm it reads and feels right. |
| After phase 1 | Confirm in a browser that adding an item on `/item/DT-0001` moves the masthead count | The whole design rests on `lib/cart.ts` resolving to a single module instance shared between the layout chunk and the page chunk. If it were ever duplicated the symptom is silent — the indicator simply would not update — and no test would obviously say why. |
| After phase 4 | Merge to `main` with `--no-ff` | CLAUDE.md forbids committing directly to `main`; every change arrives on a branch and merges with `--no-ff`. Not automated here by choice. |

No new environment variable is needed. `/api/checkout` reads no key and makes no outbound call, so
nothing is added to `.env`, `.env.example`, or Vercel's project settings.

## Phase 1: Cart foundation

**Goal** — A cart exists: items can be added from an item's detail page and the masthead shows a
running count on every page. There is not yet anywhere to view the cart.

**Prerequisites** — None.

### Tasks

- [x] Create `lib/checkout.ts` — the directive-free shared contract (constants and types), imported
      by the client store, the client components and the route handler alike.
- [x] Create `lib/cart.ts` — the `"use client"` cart store, to the contract in Technical details.
      **[complex]** (depends on `lib/checkout.ts`)
  - [x] Snapshot tri-state and the two frozen module-level constants
  - [x] `subscribe` / `getSnapshot` / `getServerSnapshot` / `useCart`
  - [x] `readStorage`, `discard`, `readItems` — every failure path returning a snapshot, never throwing
  - [x] `writeStorage` and the single `commit` write path
  - [x] Mutators `add`, `setQuantity`, `remove`, `clear`, `reload`, and the `countItems` selector
- [x] Create `components/CartIndicator.tsx` (`"use client"`) — a link to `/cart` with the item count,
      rendering a skeleton and never a literal `0` while the snapshot is loading.
- [x] Create `components/AddToCart.tsx` (`"use client"`) — add control for the item detail page,
      disabled with a reason when out of stock or at the per-line cap.
- [x] Modify `app/layout.tsx` — render `<CartIndicator />` inside `.masthead__inner`. Do **not** add
      a `"use client"` directive to the layout.
- [x] Modify `app/item/[sku]/page.tsx` — render `<AddToCart sku={item.sku} inStock={item.inStock} />`
      beside the existing stock badge.
- [x] Modify `app/globals.css` — masthead layout, cart indicator, `.button:disabled`, and the two
      missing state rules.
- [x] Extend `tests/smoke.spec.ts` with the phase-1 cases listed in Technical details.

### Technical details

**`lib/checkout.ts`** — no directive. It must stay directive-free because `app/api/checkout/route.ts`
(a server module) imports the same constants and types; importing a non-function binding from a
`"use client"` module into server code yields a client reference, not the value.

```ts
export const CART_VERSION = 1;
export const MAX_LINES = 20;
export const MAX_PER_LINE = 10;
export const CART_KEY = "aurora.cart";
export const ORDER_KEY = "aurora.order";

export type CartLine = { sku: string; quantity: number };
export type StoredCart = { version: number; items: CartLine[] };

export type OrderLine = {
  sku: string;
  name: string;
  quantity: number;
  unitPriceEur: number;
  lineTotalEur: number;
};

export type OrderResponse = {
  reference: string;
  /** ISO `YYYY-MM-DD`. Render only through `formatDate`. */
  placedOn: string;
  lines: OrderLine[];
  totalEur: number;
  currency: "EUR";
};

export type Shipping = {
  fullName: string;
  addressLine: string;
  city: string;
  postalCode: string;
  phone: string;
};

export type CheckoutRequest = { items: CartLine[]; shipping: Shipping };
```

**`lib/cart.ts`** — carries `"use client"`, which makes importing the store from a server component a
build error. That is deliberate: it is the failure you most want caught at build time.

```ts
export type CartSnapshot =
  | { status: "loading" }
  | { status: "ready"; items: readonly CartLine[] }
  | { status: "unavailable"; items: readonly CartLine[] };
```

`unavailable` means browser storage is blocked or throwing — the cart still works in memory for this
page view, it just will not persist. Both non-loading states carry `items`, so a consumer needs one
`status === "loading"` check before reading `cart.items`.

Rules that are load-bearing. Each one, if broken, produces a React console error, and the Playwright
suite's `watchConsole` helper asserts zero console errors:

- `getServerSnapshot()` returns a **frozen module-level constant**, the same object every call.
  Returning a fresh object makes React log *"The result of getServerSnapshot should be cached to
  avoid an infinite loop"*.
- `getSnapshot()` returns a **cached module-level reference** and **never throws**. React treats a
  throw as "snapshot changed" and re-renders into a loop.
- The first `localStorage` read happens lazily inside `getSnapshot`, behind a `loaded` flag and a
  `typeof window === "undefined"` guard. The guard matters: the module singleton persists across
  requests in the running server, and it must be impossible for one request to leave a non-loading
  value behind for the next.
- **Never** write `typeof window !== "undefined" ? … : …` in a client component's render. It is a
  guaranteed hydration text mismatch.
- **Every `catch` block stays silent.** `page.on("console")` does not distinguish React's errors from
  yours, so a well-meant `console.error` in a catch is what fails the suite.

`commit(items)` is the single write path. It always assigns a **new** snapshot object so `Object.is`
differs, then calls every listener in a `Set<() => void>`. That loop is the entire same-tab
notification mechanism; because it runs synchronously inside a click handler, React batches the
masthead and any open cart list into one commit. **Do not add a `storage` event listener** — the spec
explicitly does not want live cross-tab sync.

Storage failure handling, all inside the store:

| Failure | Resolves to |
|---|---|
| `getItem` throws (private window, blocked storage) | `{ status: "unavailable", items: [] }` |
| `setItem` throws (blocked, or `QuotaExceededError`) | `commit` assigns `unavailable` but the mutation still applies in memory |
| Unparseable JSON | Remove the key, `{ status: "ready", items: [] }` |
| `version !== CART_VERSION` | Remove the key, `{ status: "ready", items: [] }`. This single `if` is the designated migration hook for a future v2. |
| `items` not an array | Whole payload discarded as above |
| An entry with a non-string `sku`, a non-integer or `< 1` quantity, or a duplicate `sku` | That entry skipped, the rest kept |
| Over-cap stored values | `Math.min(quantity, MAX_PER_LINE)`, and `break` at `MAX_LINES` |

A stored `sku` that is not in the catalogue is deliberately **not** the store's concern — the store
does not know the catalogue. It is caught in phase 2 against the server-supplied lookup, and again,
independently, in the phase 3 route handler.

Mutator signatures:

```ts
export type AddResult = "added" | "line-limit" | "quantity-limit";

export function add(sku: string, quantity?: number): AddResult;
export function setQuantity(sku: string, quantity: number): void; // <= 0 removes
export function remove(sku: string): void;
export function clear(): void;
export function reload(): CartSnapshot; // re-reads storage; checkout calls this on submit
export function countItems(items: readonly CartLine[]): number; // sums quantities
export function useCart(): CartSnapshot;
```

Cap outcomes come back as a **return value**, not as store state, so the "cart is full" message lives
in the button's own `useState`, set from an event handler — where no hooks rule applies. Every
mutator early-returns on a no-op so it neither allocates a snapshot nor notifies.

**`components/CartIndicator.tsx`** — render a **stable outer element in both branches** so the
`aria-live` region survives the loading→ready swap; swapping the outer element replaces the live
region and the count may never announce.

```tsx
<Link className="masthead__cart" href="/cart" aria-live="polite">
  Cart{" "}
  {cart.status === "loading" ? (
    <span className="skeleton skeleton--line" aria-label="Counting your cart"
          style={{ width: "2.5rem", display: "inline-block" }} />
  ) : (
    <span className="masthead__cart-count">{countItems(cart.items)}</span>
  )}
</Link>
```

A literal `0` in the loading branch is forbidden: a `0` that becomes `3` two frames later *is* the
empty-cart flash the spec rules out. The inline `style` for a one-off skeleton width follows the
precedent already in `app/item/[sku]/loading.tsx`. The indicator shows on **every** page including
checkout and confirmation — unconditionally, with no pathname awareness.

**`components/AddToCart.tsx`** — props `{ sku: string; inStock: boolean }`. Disabled with visible
wording when `!inStock`, and after `add()` returns `"quantity-limit"` or `"line-limit"`. The outcome
message goes in an `aria-live="polite"` region; no navigation, no router call.

**`app/globals.css`** additions:

- `.masthead__inner` currently has **no layout rules at all** — add `display: flex`,
  `align-items: center`, `justify-content: space-between`, `gap: 1rem`.
- `.masthead__cart`, `.masthead__cart-count`.
- `.button:disabled` — there is currently no `:disabled`, `:hover` or `:focus-visible` rule for
  `.button` anywhere.
- **`.state--empty` and `.state--loading`.** `components/StateMessage.tsx` has emitted these class
  names since it was written, but only `.state--error` is defined. Every empty and loading state this
  feature adds would otherwise render unstyled. Pre-existing gap; fix it here because this feature is
  the first to depend on it.

**Tests** — append to `tests/smoke.spec.ts`, matching its conventions: lowercase declarative titles,
flat top-level `test(...)` calls with no `describe`, CSS-class locators for house chrome and
role locators for headings and links, and `watchConsole` for pages under test.

- `"adding an item from its detail page moves the masthead cart count"`
- `"adding the same item twice raises the quantity rather than adding a line"`
- `"an out-of-stock item cannot be added to the cart"`

The catalogue's seeded paths are `/category/desk-tools` and `/item/DT-0001`; find an out-of-stock sku
by reading `data/catalogue.json` rather than assuming one.

### Done when

- `npm run typecheck`, `npm run lint`, `npm run build` and `npm test` all pass.
- The masthead shows a cart count on every page, and it survives a reload.
- Adding an item on the item page moves the count with no navigation.
- Adding the same item twice gives a count of two, not two lines.
- An out-of-stock item's add control is disabled and says why.
- No `useEffect` exists anywhere in `lib/cart.ts`, `components/CartIndicator.tsx` or
  `components/AddToCart.tsx`.
- The browser check in **Action required** has been done.

## Phase 2: The cart page

**Goal** — `/cart` exists and works: it lists what is in the cart with prices and a subtotal, and
quantities can be changed and lines removed.

**Prerequisites** — Phase 1.

### Tasks

- [ ] Create `app/cart/page.tsx` — server component holding the header and the catalogue lookup.
- [ ] Create `app/cart/loading.tsx`, `app/cart/error.tsx`, `app/cart/not-found.tsx` — all three;
      CLAUDE.md requires every segment to own all three.
- [ ] Create `components/CartLines.tsx` (`"use client"`) — the four states, quantity controls,
      removal, subtotal. **[complex]** (depends on `app/cart/page.tsx` for its props)
  - [ ] Loading, empty, error and success branches
  - [ ] Quantity up/down bounded at 1 and `MAX_PER_LINE`, with the out-of-range control disabled
  - [ ] Per-line removal, and a "remove unavailable" action
  - [ ] Unavailable-line handling: excluded from the subtotal, blocks checkout
  - [ ] Subtotal in integer cents, rendered through `formatMoney`
- [ ] Modify `components/ConvertedPrice.tsx` — accept an optional `className`.
- [ ] Modify `app/globals.css` — cart line layout, quantity control, subtotal block.
- [ ] Extend `tests/smoke.spec.ts` with the phase-2 cases listed in Technical details.

### Technical details

**`app/cart/page.tsx`** — a server component. It builds a lookup from the existing accessor and
passes it to the client list as a prop:

```ts
const lookup: Record<string, { name: string; priceEur: number; currency: "EUR";
  inStock: boolean; image: ItemImage }> = {};
for (const category of getCategories()) {
  for (const item of category.items) { lookup[item.sku] = { /* … */ }; }
}
```

Read only through `getCategories` / `getCategoryBySlug` / `getItemBySku`; never import
`data/catalogue.json` directly. Serialising the whole table into the RSC payload is fine at 12 items
— leave a comment noting it would need rethinking (a route handler, or a sku-filtered lookup) at
thousands.

Header: `<PageHeader eyebrow="Order" title="Your cart" subtitle={…} />`. All three new pages share
the eyebrow `"Order"`, which groups them as one section and keeps them distinct from the catalogue's
own eyebrows (`"Categories"`, `"Category"`, and the category name on the item page).

**Segment files** — copy the shape of `app/category/[slug]/` exactly:

- `loading.tsx` — a **real** `<PageHeader>` with literal copy, then skeletons below it.
  `site-reviewer` added rule A after an incident where a loading segment faked the header with
  skeleton `<div>`s carrying `page-header` classes; a skeletonised header is BLOCKING.
- `error.tsx` — `"use client"`, prop typed `{ error: Error; reset: () => void }` but destructuring
  **only** `reset`; `<StateMessage tone="error">` with a `<button type="button" className="button"
  onClick={reset}>Try again</button>` action. The raw error is never rendered.
- `not-found.tsx` — server component, `<StateMessage tone="empty">` with a
  `<Link className="button">` action.

**`components/CartLines.tsx`** — props are the cart lookup. All four states:

| State | Rendering |
|---|---|
| Loading | `<ul className="grid" aria-busy="true" aria-label="Loading your cart">` holding three `<li className="skeleton skeleton--card-compact" />` |
| Empty | `<StateMessage tone="empty" …>` with guidance pointing at the categories and a `<Link className="button" href="/">` action |
| Error | Reached when the snapshot is `unavailable`: a persistent `tone="error"` notice that the cart will not be saved because the browser is blocking storage, with guidance to enable it or check out now. Degraded, never broken — the lines still render below it. |
| Success | The lines, the subtotal, the converted approximation, and the proceed-to-checkout control |

A line whose `sku` is missing from the lookup, or whose item is `inStock: false`, renders as
unavailable: the sku, wording that it is no longer available, no price, and a remove control. It is
excluded from the subtotal and disables the checkout control, with a `tone="error"` message naming
the lines to remove. A "remove unavailable" action clears them together.

Quantity controls are bounded at 1 and `MAX_PER_LINE` (10), with the control that would exceed the
bound **disabled** rather than silently ignoring the press. Reducing to zero is a removal. Removal
has no confirmation prompt — it is trivially undone by adding the item again.

**Money arithmetic.** Convert to integer cents with `Math.round(priceEur * 100)`, multiply by
quantity, sum as integers, divide by 100 once, then pass to `formatMoney`. Summing floats and
formatting the result risks a penny drift that `formatMoney` would faithfully render. The route
handler in phase 3 uses the identical rule, so the preview and the authoritative total agree.

**`components/ConvertedPrice.tsx`** — add an optional `className` prop defaulting to
`"detail__converted"`, so the cart page can reuse it for the subtotal without inheriting a class
named for the item detail layout. Change nothing else — its existing effect already satisfies
`react-hooks/set-state-in-effect` and the reviewer's cleanup-guard rule, and it is the reference
implementation for both.

**Tests**:

- `"the cart page lists what was added, with a subtotal"`
- `"changing a quantity updates the line total and the subtotal"`
- `"removing the last line shows the cart empty state"`
- `"the cart empty state recovers to the categories index"`
- `"a cart line whose item is no longer sold is marked unavailable and blocks checkout"`

Seed the unavailable line with `page.addInitScript` writing `{"version":1,"items":[{"sku":"XX-9999",
"quantity":1}]}` to `localStorage` under `aurora.cart` before the page loads. Assert money with
`/^\d+\.\d{2} EUR$/`, matching the existing suite.

### Done when

- All four gates pass.
- `/cart` renders the house header and all four states are reachable.
- Quantity and removal work, and the subtotal follows.
- An unavailable line is excluded from the subtotal and blocks checkout.
- `.next/prerender-manifest.json` lists `/cart` after a build.

## Phase 3: Checkout and the order handler

**Goal** — An order can be placed: `/checkout` collects delivery details and `POST /api/checkout`
validates and prices it server-side.

**Prerequisites** — Phase 2.

### Tasks

- [ ] Create `lib/errors.ts` — move `ErrorCode`, `ErrorEnvelope`, `isErrorEnvelope` out of
      `lib/rates.ts`, and add `ITEM_UNAVAILABLE` to the union.
- [ ] Update the two importers: `app/api/rates/route.ts` and `components/ConvertedPrice.tsx`.
- [ ] Update the four documents that enumerate the error codes. **[complex]**
  - [ ] `CLAUDE.md` — the Rules section
  - [ ] `.claude/skills/house-style/references/rules.md` — the external-call rule
  - [ ] `.claude/agents/site-reviewer.md` — the route-handler checklist
  - [ ] Reword house rule 5 so the five-second timeout governs *outbound* calls specifically
- [ ] Create `app/api/checkout/route.ts` — `POST` only. **[complex]** (depends on `lib/errors.ts`)
  - [ ] Body parsing and shape validation
  - [ ] Item validation against the catalogue
  - [ ] Delivery-field validation
  - [ ] Integer-cent pricing and reference minting
- [ ] Create `app/checkout/page.tsx` and its three segment files.
- [ ] Create `components/CheckoutForm.tsx` (`"use client"`).
- [ ] Modify `app/globals.css` — the project's first form styling.
- [ ] Extend `tests/smoke.spec.ts` with the phase-3 cases listed in Technical details.

### Technical details

**The error-code change has four owners.** The permitted codes are written down in four places, and
`site-reviewer` reports a BLOCKING finding against any code it does not recognise. Adding
`ITEM_UNAVAILABLE` without updating all four means the reviewer blocks this feature's own handler.
`lib/rates.ts` keeps `RateResponse`; only the envelope types move.

While editing those documents, settle one adjacent ambiguity: house rule 5 requires
`AbortSignal.timeout(5000)` on route handlers, but `/api/checkout` makes no outbound call and has
nothing to wrap. Reword the rule to say it governs outbound calls, or the reviewer may reasonably
read it as universal.

**`app/api/checkout/route.ts`**:

```ts
export async function POST(request: Request) { const body = await request.json(); … }
```

No `AbortSignal`, no `process.env` read, no outbound `fetch`. Logs **nothing** from the request body,
on success or failure — delivery details are personal data and rule 5 forbids leaking into logs.

Validation order, stopping at the first failure:

1. Body is an object with `items` and `shipping` → else 400 `BAD_REQUEST`
2. `items` is a non-empty array of at most `MAX_LINES` → empty is 400, but the client renders it as
   the empty state rather than an error
3. No duplicate `sku` → 400
4. Every `sku` resolves through `getItemBySku` → 409 `ITEM_UNAVAILABLE`
5. Every item `inStock` → 409 `ITEM_UNAVAILABLE`
6. Every `quantity` is an integer in `1..MAX_PER_LINE` → 400
7. Every delivery field is non-blank after `.trim()` → 400

Then, ignoring anything price-shaped in the request:

```ts
const cents = lines.reduce((t, l) => t + Math.round(item.priceEur * 100) * l.quantity, 0);
const totalEur = cents / 100;
const placedOn = new Date().toISOString().slice(0, 10); // same shape as the rates route's today()
const reference = `AUR-${placedOn.replaceAll("-", "")}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
```

`crypto.randomUUID()` is a Node 22 global — no dependency is added. The response is the
`OrderResponse` shape from `lib/checkout.ts`; it carries **no delivery details**, so none can reach
browser storage or the confirmation page.

**`components/CheckoutForm.tsx`** — five fields (`fullName`, `addressLine`, `city`, `postalCode`,
`phone`) with real `<label>` elements, not placeholder text standing in for labels. Client validation
mirrors the server rules exactly; where they could drift the server wins. A muted line **above the
fieldset** states that this is a demonstration shop and no order will be dispatched — above, not only
on the confirmation, because the form asks for a real name, address and telephone number.

Calls the store's `reload()` on submit so the order reflects storage at that moment. Submit is
disabled while in flight. A 409 returns the visitor to `/cart`; every other rejection keeps them on
the form with input intact and focus moved to the first field at fault, its message associated with
the field.

**The only `useEffect` in the entire feature** is the in-flight abort, and it must take the
cleanup-only form:

```tsx
const inFlight = useRef<AbortController | null>(null);
useEffect(() => () => inFlight.current?.abort(), []);
```

An empty setup body means there is no `setState` for `react-hooks/set-state-in-effect` to flag, and
the abort *is* the cleanup the reviewer's rule B asks for. Run `npm run lint` against this construct
on its own before building out the rest of the form — it is the only place in the feature that comes
near the hooks rules, and the compiler-backed `react-hooks/refs` rule is also on at error severity.

**Form CSS** — there is currently **no** form styling in `app/globals.css`: no `.field`, `.input`,
`.label`, `.fieldset`, and no bare `input`/`label`/`form` element selectors. All of it is new.

**Tests**:

- `"checkout with an empty cart shows its empty state, not a form"`
- `"submitting checkout with a blank required field names that field"`
- `"the checkout route rejects an unknown item code with the house error envelope"`
- `"the checkout route rejects an invalid quantity"`
- `"the checkout route ignores a total sent by the client"`

Route-level cases use the `request` fixture, as the existing rates test does. Assert the envelope is
`{ error: { code, message } }` with no other keys.

### Done when

- All four gates pass.
- `/checkout` renders the house header, its four states, and a working form.
- The handler rejects unknown sku, out-of-stock, zero, negative, fractional and over-max quantities,
  duplicate skus and no items — each with the house envelope and nothing else.
- A total sent in the request body has no effect on the total returned.
- `npm run lint` is clean with the abort effect in place.
- All four documents listing the error codes agree with `lib/errors.ts`.

## Phase 4: Confirmation, and closing out

**Goal** — The flow ends properly, the rule file tells the truth again, and the feature is ready to
merge.

**Prerequisites** — Phase 3.

### Tasks

- [ ] Create `lib/order.ts` — the same external-store shape over `sessionStorage`.
- [ ] Create `app/checkout/confirmation/page.tsx` and its three segment files.
- [ ] Create the confirmation's client reader component.
- [ ] Wire success: write the order, clear the cart, then navigate.
- [ ] Modify `CLAUDE.md` — correct the claim about client components; add the cart key, version and
      the checkout endpoint.
- [ ] Extend `tests/smoke.spec.ts` with the phase-4 cases listed in Technical details.
- [ ] Run the `site-reviewer` subagent and address every BLOCKING finding.
- [ ] Record at least one entry under **Deviations**, and complete the **Session log**.

### Technical details

**`lib/order.ts`** — the same `subscribe` / `getSnapshot` / `getServerSnapshot` shape as `lib/cart.ts`,
for consistency and to keep the feature's effect count at one. Hold the order as a **module variable
mirrored to `sessionStorage`** under `ORDER_KEY`. The confirmation reads the module variable first,
so it survives the client-side `router.push` (a soft navigation with no reload), and falls back to
`sessionStorage` so a refresh still works. Blocked storage then degrades to "works until you refresh"
rather than a blank confirmation.

Session scope, not local, is deliberate: it is what makes a refresh work and a bookmarked
confirmation fall through to the empty state, with no server involvement.

**The confirmation page** — `<PageHeader eyebrow="Order" title={…} subtitle={…} />` where the
subtitle states plainly that this is a demonstration shop and that nothing is stored or dispatched.
Four states; landing there cold, or in a later browser session, shows the **empty** state — not an
error and not a not-found. No address is shown back: the order response carries no delivery details.
Render `placedOn` through `formatDate` and every amount through `formatMoney`.

**Success wiring** — write the order, `clear()` the cart, then navigate. In that order: clearing
before writing loses the order if the write throws. Reloading the confirmation re-reads storage and
issues no second request, which is what makes the no-duplicate-order criterion hold — and note that
nothing is persisted server-side anyway, so there is no first order for a second to duplicate.

**`CLAUDE.md`** — the line reading *"`ConvertedPrice` is the only client component"* is now false and
`site-reviewer` will be checking against it. Replace it with the real rule: pages stay server
components; client code lives in named leaves. Add the cart's storage key and version and the
checkout endpoint to the architecture notes. Keep the file under roughly 150 lines, per the
assignment's own criterion for the rule file.

**Do not** use `searchParams` on the confirmation to carry the order — it is the obvious alternative
to `sessionStorage` and it would make the page dynamic. Nor `cookies()` in the root layout, nor
`next/dynamic` with `ssr: false`, nor `export const dynamic = "force-dynamic"`. All four force
dynamic rendering, and the last three would also break the server-rendered loading state.

**Tests**:

- `"completing checkout reaches a confirmation with a reference and a total"`
- `"the cart is empty after an order is placed"`
- `"reloading the confirmation shows the same order and places no second order"`
- `"opening the confirmation directly shows its empty state"`

Assert the date with `/^\d{2} [A-Z][a-z]{2} \d{4}$/` and money with `/^\d+\.\d{2} EUR$/`, matching the
existing suite.

### Done when

- All four gates pass, with new coverage for every new page and state.
- The full flow works end to end and the cart empties afterwards.
- Reloading the confirmation is harmless; opening it cold shows the empty state.
- `.next/prerender-manifest.json` lists `/cart`, `/checkout` and `/checkout/confirmation`.
- `site-reviewer` reports no BLOCKING findings.
- `CLAUDE.md` no longer contains a false statement about client components.
- The browser pass in **Action required** is done, **Deviations** has at least one real entry, and
  the **Session log** has one row per session.

## Decisions

| Decision | Reasoning | Alternatives rejected |
|---|---|---|
| The cart is a module-level external store read with `useSyncExternalStore` | It is the only mechanism needing **no** `useEffect`, so `react-hooks/set-state-in-effect` and the reviewer's cleanup-guard rule are both unreachable. React also handles the hydration boundary itself: during hydration it calls `getServerSnapshot` and never `getSnapshot`, so server and client output are identical by construction | A React context provider — **not** because it would make pages client components. It would not: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` shows a provider wrapping `{children}` in a server `layout.tsx` as a supported pattern, and a client leaf in a server layout likewise changes nothing. Do not write "context breaks RSC" anywhere; the bundled docs contradict it. It loses for narrower reasons: a lazy `useState` initializer reading `localStorage` produces a hydration mismatch in the console, and the `useEffect` alternative is the lint error. Also rejected: `useEffect` + a `window` CustomEvent, which works but duplicates an effect and a cleanup guard per consumer and makes a bare event-name string a de facto public API |
| The cart page is priced from a server-supplied lookup, not a request | Keeps the feature at one new endpoint instead of five, keeps `/cart` statically generated, and avoids a render waterfall. The authoritative total is still computed server-side, at the only moment it matters | A `GET /api/cart` or `POST /api/cart/price` endpoint. Also rejected: server-side cart state, which is impossible — there is no database and the route handlers are stateless |
| Checkout submits to a route handler, not a Server Action | No Server Action precedent exists in the repo, and the house rules put this boundary in `app/api/*/route.ts` with the `{ error: { code, message } }` envelope. `ConvertedPrice` already establishes the client-fetches-own-route-handler pattern | A Server Action, which would bypass the error envelope and introduce a second mutation idiom |
| Money is summed in integer cents | `priceEur` is a float; summing floats risks a penny drift that `formatMoney` would faithfully render. The same rule client-side and server-side keeps the preview and the authoritative total in agreement | Summing floats and rounding at the end; `toFixed`, which the house rules forbid outright |
| The cart stores `{ sku, quantity }` only | A price corrected in the JSON then reaches every existing cart on the next deploy, and the browser never holds a figure that could contradict the server | Storing the price at add-time, which is the conventional answer and is pointless here because no order is persisted for it to go stale against |
| One new error code, `ITEM_UNAVAILABLE` (409) | It changes what the interface *does*, not merely what it says: an unavailable item can only be fixed on the cart page, so that rejection sends the visitor there. Everything else is fixed where they stand | Reusing `BAD_REQUEST` for everything, which loses the behavioural distinction. Also rejected: adding a field identifier to the envelope — the form validates all five fields before submitting, so a server rejection naming a field is only reachable when the two rule sets have drifted, which is a defect rather than a path to design for |
| The confirmation is its own route segment | The brief says the checkout ends at a confirmation *page*; a distinct address makes the back button behave, and a state-of-checkout confirmation makes the address bar lie | A fourth state of `/checkout`, which is three fewer files but wrong in the address bar |
| Add to cart from the item detail page only | The category listing stays a static server-rendered grid. Putting a control on `ItemCard` turns every card into a client component and costs the listing its static rendering | Adding from the listing too — recorded as a follow-up in the spec |
| The masthead gains the cart indicator and nothing else | The cart link is forced by this feature; the wordmark link is not, and the categories-index spec deferred navigation deliberately. Every empty, error and confirmation state offers its own route back, so nothing is a dead end | Making the wordmark a link home at the same time, which would smuggle in deferred work |
| The indicator shows on every page, including checkout and confirmation | Unconditional, no pathname awareness, no per-route logic. On the confirmation the count reads zero because the cart was just emptied, so it invites nothing | Suppressing it inside the order flow, which would make the masthead route-aware and therefore need the pathname on every page in the site |
| One demonstration notice above the delivery fields, plus the confirmation subtitle | Enough to be read before typing, without turning the page into a disclaimer | Marking the fieldset as well (reads as nagging); saying it only on the confirmation, which tells people after they have already typed a real address |
| Delivery details are never persisted | Not across navigation, not in storage, not in the response, not shown back on the confirmation. A five-field form is cheap to retype, and nothing else on the site persists input | Holding them in browser storage for convenience, which would put a name, address and phone number into storage the spec's security section keeps them out of |
| `.state--empty` and `.state--loading` get CSS rules in phase 1 | `StateMessage` has emitted these class names since it was written but neither is defined, so every empty and loading state this feature adds would render unstyled. This feature is the first to depend on them | Leaving the pre-existing gap alone, which would ship visibly unstyled states |

## Open questions

| Question | Blocking? | Owner |
|---|---|---|
| Does `site-reviewer` read house rule 5's five-second timeout as applying to every route handler, or only to handlers making an outbound call? Phase 3 rewords the rule on the assumption it is the latter; if that reading is wrong, `/api/checkout` needs a different accommodation | No — settled by the phase 3 rewording unless the reviewer disagrees | Project owner, at the phase 3 review |
| Is the `sku → item` lookup better passed whole into the RSC payload, or filtered? Whole is correct at 12 items and the plan does that; the threshold at which it stops being correct is not established | No | Revisit if the catalogue grows past a few hundred items |

## Deviations

| Phase | Deviation | Why |
|---|---|---|
| 1 | `components/CartIndicator.tsx` passes `prefetch={false}` to its `<Link href="/cart">` | The masthead renders on every page, so with `/cart` not yet routed Next's default prefetch 404s on every page load and the suite's `watchConsole` helper fails two of the new tests on a console error the feature does not actually have. It is temporary: phase 2 creates the route and removes the prop. A comment in the file says so. |
| 1 | `.claude/launch.json` added | Not in the plan, but **Action required** calls for browser checks after phases 1 and 4 and the Browser pane needs a named dev-server configuration to start one. |

## Session log

| Date | Phases touched | Notes |
|---|---|---|
| 2026-09-22 | — | Plan written from the plan-mode session. Spec committed as `99e4d2c`. No code written yet. |
| 2026-09-22 | 1 | Phase 1 built and committed. `lib/checkout.ts` (contract), `lib/cart.ts` (the `useSyncExternalStore` store, no `useEffect` anywhere), `CartIndicator`, `AddToCart`, masthead flex layout, `.button:disabled`, and the missing `.state--empty` / `.state--loading` rules. Three new Playwright cases; 11 pass. Typecheck, lint and build clean. Browser check done: adding on `/item/DT-0001` moved the masthead count to 1 then 2 with no navigation and no console output, and the count survived a navigation — so the store is one shared module instance across the layout and page chunks, which was the risk the check existed for. One deviation recorded (`prefetch={false}`). `site-reviewer` run: no BLOCKING findings. Acted on three advisories — `load()` no longer empties an in-memory cart when storage is unreadable (latent, but phase 3's `reload()` on submit would have hit it), the add confirmation now carries the new quantity so the live region has something to announce on a repeat add and says when storage is blocked, and the masthead count is now asserted on the index and a category page too. |
