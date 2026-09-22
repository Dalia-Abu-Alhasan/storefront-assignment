# Cart And Checkout

| | |
|---|---|
| **Slug** | `cart-and-checkout` |
| **Branch** | `claude/feature/cart-and-checkout` |
| **Status** | Draft |
| **Created** | 2026-09-22 |

## 1. Summary

The shop can be browsed but not bought from. This adds a cart a visitor builds up across pages, a
cart page where it can be reviewed and changed, a checkout that collects delivery details, and a
confirmation that ends the flow. The cart lives in the visitor's own browser; the one thing the
server does is re-price and re-check the cart at the moment of ordering, so that no total and no
availability claim originates on the client.

It is deliberately sized to need several sessions rather than one: it touches new client-held
state, a new route handler, and four new pages, and no single one of those can be finished without
the others being at least sketched.

## 2. Problem

A visitor can reach a category, read an item, see its price in EUR and an approximation in USD, and
then stop. There is nothing to collect a second item into and no way to signal intent to buy. The
catalogue is a reference work rather than a shop, and the site's own name promises otherwise.

Three things follow from that gap:

- Choosing between items means holding them in your head or in browser tabs. Nothing accumulates,
  so there is no point at which a visitor sees what a combined order would cost.
- The only price arithmetic the site performs is one item against one exchange rate. It has never
  had to add two prices together, which means it has never had to decide where that sum is computed
  or whose number is authoritative.
- There is no point in the site where a visitor supplies anything. Every page is read-only, so
  there is no form, no validation, no request that can fail on bad input, and no established shape
  for telling someone what they typed wrong.

## 3. Goals and non-goals

**Goals**

- A visitor can add an item to a cart from its detail page, and add the same item again to increase
  how many they want.
- The cart survives navigation between pages and a closed and reopened browser, without an account.
- A visitor can see the cart's contents, each line's price and line total, and the order subtotal.
- A visitor can change a line's quantity or remove a line, and see the subtotal follow.
- A visitor can see roughly what the order comes to in the site's secondary currency, using the
  exchange-rate route the item page already uses.
- A visitor can supply delivery details, have them checked, and be told precisely what is wrong
  when something is.
- The order's total and the availability of everything in it are decided by the server from the
  committed catalogue, never by the browser.
- A visitor who places an order reaches a confirmation carrying an order reference and a summary of
  what was ordered.
- A cart holding something the catalogue no longer sells recovers gracefully rather than failing.
- Every new page carries the house header and every new list carries all four states, so the
  feature is indistinguishable in style from the pages that already exist.

**Non-goals**

- No payment of any kind. No provider, no card entry, no payment page, no stored instrument. The
  flow ends at a confirmation and the order is never fulfilled.
- No persisted order. Nothing is written server-side, because there is nowhere to write it — see
  section 7. The confirmation renders what the server returned, not a record it looks up.
- No accounts, sign-in, sessions or per-user carts. The cart belongs to a browser, not a person.
- No order history, no way to retrieve a past order, no order-status lookup.
- No email, no notification, no receipt beyond the confirmation page itself.
- No stock levels or reservation. `inStock` stays the boolean it is; a cart does not hold anything
  back from anyone else.
- No discount codes, promotions, gift options, tax calculation or shipping cost. The subtotal is
  the total.
- No address lookup, postcode validation against a real dataset, or country selection. Delivery
  details are checked for presence and shape only.
- No change to the catalogue data shape, the types, the validator, or `data/catalogue.json`.
- No change to the exchange-rate route handler. It is called, not modified.
- No new runtime dependency.

## 4. User stories

- As a visitor reading an item, I want to add it to a cart, so that I can keep looking without
  losing track of what I want.
- As a visitor who wants two of something, I want adding it again to raise the quantity rather than
  create a second line, so that the cart reflects an order rather than a click history.
- As a visitor who closed the tab yesterday, I want my cart to still be there, so that I do not have
  to rebuild it from memory.
- As a visitor with several items collected, I want to see them listed with prices and a subtotal,
  so that I know what the order costs before I commit to anything.
- As a visitor reconsidering, I want to change a quantity or remove a line, so that the cart matches
  what I actually want.
- As a visitor who thinks in dollars, I want an approximate total in the secondary currency, so that
  the EUR figure means something to me.
- As a visitor ready to order, I want to supply my delivery details and be told clearly if something
  is missing, so that I am not guessing at what the form wants.
- As a visitor who has ordered, I want a confirmation with a reference and a summary, so that I have
  evidence of what I asked for.
- As a visitor whose cart contains something that has since been withdrawn, I want to be told which
  line is the problem and be able to continue without it, so that a stale cart is not a dead end.

## 5. User experience

**Entry point** — The cart is built from an item's detail page, which is where price, availability
and description are already shown and therefore where the decision is made. The cart itself is
reached from a persistent indicator in the masthead, which becomes the first navigation the site has
ever had. Checkout is reached only from the cart page, and the confirmation only by completing
checkout.

**Main flow**

1. A visitor on an item's detail page activates the add-to-cart control. The control confirms in
   place that the item was added and what the cart now holds; the page does not navigate away.
2. The masthead indicator updates to the new number of items.
3. The visitor continues browsing, adding further items, and the indicator keeps up.
4. The visitor opens the cart from the masthead.
5. The cart page lists one line per item, each with its image, name, unit price, the quantity, and
   the line total, followed by the subtotal and the approximate secondary-currency equivalent.
6. The visitor adjusts a quantity or removes a line. The affected line total and the subtotal update
   immediately, with no page reload and no confirmation prompt for a removal, which is trivially
   undone by adding the item again.
7. The visitor proceeds to checkout.
8. The checkout page shows a read-only summary of the order alongside a form for delivery details.
9. The visitor completes the form and submits. The submit control becomes unavailable while the
   request is in flight, so a second press cannot send a second order.
10. The server re-reads the catalogue, confirms every line is still sold and still in stock,
    recomputes the total from the catalogue's own prices, and returns an order reference.
11. The visitor arrives at the confirmation, which shows the reference, the date, the lines as
    ordered with the prices the server used, and the total the server computed.
12. The cart is emptied, and the masthead indicator returns to showing nothing.
13. The confirmation offers a way back into the catalogue.

**States** — The cart is client-held, so on every page that reads it the first paint happens before
the cart is known. The loading state is therefore genuinely reachable on every render, not a
formality: it is what the visitor sees between the server's HTML arriving and the browser's own
storage being read.

*Cart page*

| State | Behaviour |
|---|---|
| Loading | The house header renders immediately, followed by placeholder lines matching the shape of real ones, marked busy and labelled. This is the state on first paint of every visit, before the browser's stored cart has been read. |
| Empty | The house header, then an empty-toned state message saying the cart holds nothing and telling the visitor what to do about it — browse the categories — with a control that goes there. Not a bare "cart is empty". |
| Error | The house header with an error title, then an error-toned message naming what failed — the stored cart could not be read, or could not be understood — with guidance and a control that discards the unreadable cart and starts again. Recovering must be possible without the visitor knowing what browser storage is. |
| Success | The house header, the lines, the subtotal, the secondary-currency approximation, and the control that proceeds to checkout. |

*Checkout page*

| State | Behaviour |
|---|---|
| Loading | Header plus placeholders, as on the cart page, until the stored cart is read. |
| Empty | Checkout cannot proceed with nothing in the cart. The house header, then an empty-toned message explaining that and offering a way back to the cart and to the catalogue. Reached by opening checkout directly, or after emptying the cart in another tab. |
| Error | Two distinct failures, both rendered through the house error treatment without discarding what the visitor typed: the submission was rejected for something the server checked, in which case the message names it and the form is still there to correct; or the request itself failed to complete, in which case the message says so and offers to submit again. |
| Success | Not rendered here. Success navigates to the confirmation. |

*Confirmation page*

| State | Behaviour |
|---|---|
| Loading | Header plus a placeholder summary, until the order returned by the server has been read from the browser. |
| Empty | Reached by opening the confirmation address directly, or by returning to it in a later browser session. The house header, then an empty-toned message explaining there is no recent order to show, with a way back to the catalogue. This is the state that makes a bookmarked confirmation harmless. |
| Error | The stored order could not be read or understood. Error-toned message, guidance, and a route back to the catalogue. |
| Success | Reference, order date, the ordered lines with the server's prices, the server's total, and a control back into the catalogue. The subtitle states plainly that this is a demonstration shop: nothing is stored and nothing will be dispatched. |

**Interaction details**

- Adding an item that is already in the cart raises its quantity rather than appending a line.
- Quantity is bounded: at least one and at most ten per line, and the cart holds at most twenty
  distinct lines. At the bounds the controls that would exceed them are unavailable rather than
  silently ignoring the press. Twenty lines is more than the catalogue currently holds, so the line
  cap bounds what a hand-made request can send rather than anything the interface can reach.
- Reducing a quantity to zero is a removal, and is treated as one.
- An out-of-stock item cannot be added: the detail page's add control is unavailable and says why,
  rather than accepting the click and failing later at checkout.
- A line whose item is no longer in the catalogue, or is no longer in stock, is shown on the cart
  page marked as unavailable, is excluded from the subtotal, and blocks checkout until it is
  removed. The cart page offers to remove all such lines in one action.
- The masthead indicator shows the total number of items, counting quantities, not the number of
  lines. With nothing in the cart it shows no number.
- The masthead gains the cart indicator and nothing else. The wordmark stays inert, as the previous
  feature decided when it deferred navigation: this change adds the one link the cart makes
  unavoidable and does not quietly take the wider navigation work with it. Every empty, error and
  confirmation state offers its own route back into the catalogue, so no page is a dead end.
- All three new pages carry the same eyebrow, naming the order flow as one section and setting it
  apart from the catalogue's own eyebrows — the category page's fixed word and the item page's
  category name. The pages differ in their heading and subtitle, not in their eyebrow.
- The cart survives a closed browser. It is not shared between browsers, devices or private
  windows, and the empty state is what a visitor sees in a browser that has never had a cart.
- Two tabs of the same site do not synchronise live; each reads the stored cart when it renders.
  Checkout re-reads storage on submit, so the order reflects the cart as it is at that moment.
- Delivery details are not stored. Navigating away from checkout and back presents an empty form,
  and the spec does not promise otherwise.
- Refreshing the confirmation shows the same order again and sends nothing, so no refresh can
  produce a second order.

**Accessibility**

- The cart is a real list, so its length is announced. Each line's controls name the item they act
  on rather than being a bare "Remove", which is meaningless out of context.
- The add-to-cart confirmation, the cart count and every subtotal change are announced politely
  through a live region, because they are the consequences of an action that causes no navigation.
- The loading placeholders are marked busy and labelled, matching the existing pages.
- Form fields have real labels, not placeholder text standing in for them. A rejected submission
  moves focus to the first field at fault and associates each message with its field, so the reason
  is reachable without hunting.
- The quantity controls are reachable and operable from the keyboard, and their unavailable state
  is conveyed to assistive technology rather than by appearance alone.
- Nothing — availability, validity, or the fact that a line is excluded from the subtotal — is
  conveyed by colour alone.

## 6. Interface contract

One new operation. Everything else in the feature is client-held state and server-rendered pages
reading committed data through the existing accessors.

The cart page does not call the server to price itself. Its page shell is a server component that
already holds the catalogue, so it supplies the prices, names, images and availability its lines
need alongside the rendered HTML. The displayed subtotal is therefore a preview derived from
server-supplied data, and the authoritative total is computed once, by the operation below, at the
moment of ordering.

| Operation | Trigger | Purpose | Success result |
|---|---|---|---|
| Place order | Submitting the checkout form | Re-read the catalogue, confirm every line is still sold and in stock, recompute the total from the catalogue's prices, and mint an order reference | The order reference, the date, the priced lines, and the total |
| Read exchange rate | Rendering a total on the cart and checkout pages | Existing operation, unchanged. Converts a EUR amount to the secondary display currency | The rate, as it does today |

**Inputs**

| Field | Type | Required | Rules |
|---|---|---|---|
| `items` | array | Yes | At least one entry, at most twenty. No two entries may carry the same `sku`. |
| `items[].sku` | string | Yes | Must match an item in the catalogue. |
| `items[].quantity` | integer | Yes | At least one, at most ten. Whole numbers only. |
| `shipping.fullName` | string | Yes | Non-empty after trimming. |
| `shipping.addressLine` | string | Yes | Non-empty after trimming. |
| `shipping.city` | string | Yes | Non-empty after trimming. |
| `shipping.postalCode` | string | Yes | Non-empty after trimming. Shape is not checked against any country's real format. |
| `shipping.phone` | string | Yes | Non-empty after trimming. Digits, spaces and the usual separators. Not verified. |

No price, line total, subtotal or total is accepted in the request. If one is sent it is ignored,
not trusted and not echoed.

**Outputs**

| Field | Type | Notes |
|---|---|---|
| `reference` | string | Minted by the server for this response: a fixed prefix, the order date, and a short random suffix drawn from the platform's own randomness, so no dependency is added. Not persisted and not retrievable afterwards — see section 7. |
| `placedOn` | string | ISO `YYYY-MM-DD`, matching the catalogue's own date convention. Rendered only through the house date formatter. |
| `lines[].sku` | string | As supplied, after validation. |
| `lines[].name` | string | From the catalogue, not from the request. |
| `lines[].unitPriceEur` | number | From the catalogue. |
| `lines[].quantity` | integer | As supplied, after validation. |
| `lines[].lineTotalEur` | number | Computed by the server. |
| `totalEur` | number | Computed by the server as the sum of the line totals. |
| `currency` | string | The ISO code the amounts are in, always `EUR`, so the client renders through the house money formatter without assuming. |

**Errors**

Failures use the envelope the project already has — a single `code` and a single human `message`,
nothing else. This feature adds no new shape and no field identifier. The form checks all five
delivery fields before it submits, so a server rejection naming a delivery field is reachable only
when the two sets of rules have drifted apart, and that is a defect to fix rather than a path to
design an envelope around.

It adds exactly one code. `ITEM_UNAVAILABLE` is separate from `BAD_REQUEST` because it changes what
the interface does and not merely what it says: an unavailable item can only be fixed on the cart
page, so the visitor is sent there, whereas every other rejection is fixed where they are already
standing. Nothing else earns a code — a distinction that alters only the wording belongs in the
message.

The envelope and its list of codes are house-wide rather than particular to the exchange-rate route,
and this is the change that proves it, because a second handler now returns them. They move out of
the module named for that route into a shared module of their own, and the exchange-rate route and
its client import them from there. That move is part of this feature rather than a follow-up: it is
cheaper with two importers than with three, and leaving the new handler importing its error type
from a module named after an unrelated route would be actively misleading.

| Condition | Status / code | What the user sees |
|---|---|---|
| Request body is not readable, or is not the expected shape | 400 `BAD_REQUEST` | The checkout error state, saying the order could not be read and to try submitting again |
| `items` is missing or empty | 400 `BAD_REQUEST` | The checkout empty state rather than an error, since an empty cart is a situation, not a fault |
| A `sku` is not in the catalogue | 409 `ITEM_UNAVAILABLE` | A message naming the item code that is no longer sold, and a control returning to the cart, where it can be removed |
| An item is out of stock | 409 `ITEM_UNAVAILABLE` | A message naming the item that is out of stock, and a control returning to the cart, where it can be removed |
| A quantity is not a whole number, is below one, or is above the maximum | 400 `BAD_REQUEST` | A message naming the item and the permitted range |
| The same `sku` appears twice | 400 `BAD_REQUEST` | A message saying the cart was malformed and to reload the cart page |
| A required delivery field is missing or blank | 400 `BAD_REQUEST` | The form, still filled in, with the message naming the field at fault and focus moved to it |
| The request does not complete at all | No response | The checkout error state, saying the order could not be sent, with a control to submit again |

Mapping a rejection back to a particular form field is therefore the client's job, done from its own
copy of the same rules — which is why section 8 requires the two to be stated once and never to
disagree. The one rejection a visitor will realistically meet is the unavailable item, and that
belongs to no field at all.

## 7. Data model

**Nothing is persisted server-side, and nothing can be.** The catalogue is a committed JSON file
read at import time, and the deployment target runs the route handlers as stateless functions with
no writable storage and no database. There is no cart record, no order record, no identifier a
later request could look up, and no query. An order exists only as the response to the request that
created it.

That single fact settles four things that a conventional cart specification would otherwise leave
open, and they are recorded here because they are constraints rather than choices:

- The order reference is a label on a response, not a key. Nothing can be retrieved by it and the
  confirmation cannot be reconstructed from it. It is still minted and shown, because a confirmation
  without one reads as broken — but the confirmation states plainly that this is a demonstration
  shop and that no order is kept or dispatched, so the reference implies no promise the site cannot
  keep.
- Re-submitting the same order cannot create a duplicate, because there is nothing for a first
  order to have created. The guard against double submission is a courtesy to the visitor, not a
  data-integrity measure.
- Order lines do not need to preserve the name and price against later catalogue edits, because
  there is no stored order to go stale. The response carries them so the confirmation can render
  without a second lookup.
- Availability is whatever the committed catalogue says at the moment of the request, which changes
  only on deployment.

**Client-held records**

Two pieces of browser state, both belonging to one browser on one device.

*The cart* — persistent, surviving a closed browser.

| Field | Type | Required | Constraints / default |
|---|---|---|---|
| `items` | array | Yes | Defaults to empty. At most twenty lines. |
| `items[].sku` | string | Yes | The catalogue's own item identifier. Unique within the cart. |
| `items[].quantity` | integer | Yes | At least one, at most ten. |
| `version` | integer | Yes | Identifies the stored shape, so a future change can recognise and discard an old one instead of misreading it. |

The cart stores identifiers and quantities and nothing else. It holds no price, no name, no image
and no total. Everything else a line needs is looked up in the catalogue at render time, which means
a price corrected in the JSON is reflected in every existing cart on the next deployment, and the
browser never holds a figure that could contradict the server's.

*The last order* — session-scoped, discarded when the browser session ends.

| Field | Type | Required | Constraints / default |
|---|---|---|---|
| The server's order response | object | Yes | Stored verbatim as returned. Written on success, read by the confirmation page, and never sent back to the server. It carries the reference, the date, the priced lines and the total; the response holds no delivery details, so none reach storage and the confirmation does not show an address back to the visitor. |

Session scope is deliberate: it is what makes a refresh of the confirmation work and a bookmark of
it fall through to the empty state, without any server involvement.

**Access patterns** — Three questions, all answerable with the accessors that already exist. What
does this item cost and is it in stock, by item code — the existing lookup by `sku`, used both by
the cart page shell and by the route handler. What are all the categories, for the empty states'
recovery links — the existing accessor. Nothing else is asked, no new accessor is needed, and the
JSON is not imported directly anywhere.

**Migration impact** — No server-side schema and therefore no migration. The stored cart's
`version` is the migration mechanism on the client: an unrecognised version is discarded and
reported through the cart's error state, never partially read.

**Retention and growth** — The catalogue grows only when someone commits to it. The stored cart is
bounded by the maximum number of lines and the maximum quantity per line, so it cannot grow beyond
a few hundred bytes; the stored order is bounded by the same. Browser storage quotas are not in
reach, but a write can still fail — a browser configured to refuse storage, or a private window —
and the cart page's error state is what the visitor sees when it does.

## 8. Validation rules

The server's rules are the contract. The form's rules exist so that a visitor is told about a
problem before submitting, and are the same rules stated in the same terms; where they could drift,
the server wins and the client is wrong. Every rule below is enforced in the route handler, and the
column says which are additionally checked in the browser first.

| Rule | Message | Enforced |
|---|---|---|
| The cart holds at least one line | Handled as the empty state, not as an error | Both |
| The cart holds no more than twenty lines | The cart holds too many different items to order at once | Both |
| Every item code exists in the catalogue | Names the item code and says it is no longer sold | Both |
| Every item is in stock | Names the item and says it is out of stock | Both |
| No item code appears twice | Says the cart was malformed and to reload the cart page | Server |
| Every quantity is a whole number | Names the item and the permitted range | Both |
| Every quantity is at least one | Names the item and the permitted range | Both |
| Every quantity is at most ten | Names the item and the permitted range | Both |
| Full name is present and not only whitespace | Names the field | Both |
| Address line is present and not only whitespace | Names the field | Both |
| City is present and not only whitespace | Names the field | Both |
| Postal code is present and not only whitespace | Names the field | Both |
| Phone is present and not only whitespace | Names the field | Both |
| Line totals and the order total are computed from the catalogue's prices | Not surfaced; a client-sent total is ignored rather than rejected | Server |
| The stored cart is readable and of a recognised version | The cart's error state, offering to discard and start again | Client |
| The stored order is readable | The confirmation's error state | Client |

## 9. Background and scheduled work

None. Nothing recurring, deferred, retried or scheduled. There is no abandoned cart to expire — an
abandoned cart is a row in nobody's database, sitting in a browser the site cannot reach — no order
to process, no email to send, and no cleanup to run. The deployment target provides no scheduler,
and this feature does not need one.

## 10. Security and access

The site has no authentication and this feature introduces none. Every page is open to anyone who
can reach the app, exactly as the catalogue pages are.

- There is no per-user cart, and therefore no cart that one visitor could reach by altering another
  visitor's identifier. The cart is browser storage, already confined to this origin in this
  browser by the browser itself, and no cart identifier is ever sent to the server or appears in a
  URL. A conventional cart's central authorisation concern does not exist here, and no code should
  be written as though it does.
- The order request carries item codes, quantities and delivery details. The item codes and
  quantities are validated against the catalogue before use and are never interpolated into a path,
  a query, a command or rendered output. The delivery details are read, validated, and dropped —
  they are not stored, not logged, and not echoed into the response beyond what the confirmation
  needs.
- Delivery details are personal data in transit. They travel in a request body over HTTPS, never in
  a query string, and the route handler must not log the body, whole or in part, on success or on
  failure. They are not written to browser storage, are not carried in the order response, and are
  not shown back on the confirmation.
- The form asks for a real name, address and telephone number for an order that will never be
  dispatched. The checkout page says so above the fields, not only on the confirmation afterwards,
  so that nobody supplies a real address under a misapprehension about what this site is.
- No secret is in scope. The order handler makes no outbound call and reads no environment
  variable. The exchange-rate key stays confined to its own route handler, as it is today, and the
  cart and checkout pages reach the rate only through that handler, never directly.
- Error messages name items and fields. They must not disclose anything about the file, the
  catalogue's structure, the runtime, or a stack trace — the envelope's `message` is written for a
  visitor.
- The confirmation's contents are held in session storage in the visitor's browser and are readable
  by anything else running on this origin. Nothing sensitive beyond what the visitor themselves
  typed is placed there, and the delivery details need not be among it.

## 11. Performance and scale

The catalogue holds three categories and twelve items in a few kilobytes, loaded into the module at
import time. The cart is bounded to a few hundred bytes.

- The cart and checkout page shells are server components over committed data, so they render
  statically. The only per-request work in the feature is the order handler, which reads the
  in-memory catalogue once per line and sums. Cost grows with the number of cart lines, which is
  capped, not with the size of the catalogue.
- The order handler makes no outbound call and touches no I/O, so the deployment target's function
  duration limit is not remotely in reach. The request body is bounded by the line cap and the size
  of the delivery fields, so the request size limit is not either.
- The cart and checkout pages each render one total, and therefore make at most one call to the
  exchange-rate route, which already caches upstream for an hour and is shared with the item page.
  This feature adds no new outbound traffic.
- The cart page renders one image per line at the catalogue's declared dimensions. With the line cap
  in place the page cannot grow unbounded.
- The practical ceiling is editorial. A cart capped at a handful of lines is right for a
  twelve-item catalogue and would need revisiting long before the catalogue reached a size where
  the cart page needed paging.

## 12. Testing

The project's test layer is Playwright, run against a real build served on its own port. There is no
unit test runner and no component test harness in the repository, so those layers are recorded as
absent rather than invented, and the arithmetic and validation below are proven through the
interface rather than in isolation.

**Integration**

- Adding an item from its detail page updates the masthead indicator, and the cart page then lists
  that item.
- Adding the same item twice produces one line with a quantity of two, not two lines.
- The cart persists across a navigation, and across a reload.
- The cart page shows each line's unit price and line total, and a subtotal equal to their sum, all
  in the house money format.
- Raising and lowering a quantity updates that line's total and the subtotal.
- Removing a line removes it and updates the subtotal; removing the last line leaves the cart in its
  empty state.
- The quantity controls are unavailable at the minimum and the maximum, and the quantity cannot be
  driven outside the permitted range through the interface.
- An out-of-stock item's detail page offers no working add control and says why.
- A cart containing an item code absent from the catalogue shows that line as unavailable, excludes
  it from the subtotal, and blocks checkout until it is removed.
- Opening the cart page with nothing stored shows the empty state, including its guidance and a
  recovery control that reaches the categories index.
- Opening checkout with an empty cart shows the checkout empty state rather than a form.
- Submitting the checkout form with each required field blank in turn shows a message naming that
  field, and does not navigate.
- Submitting a complete form reaches the confirmation, which shows a reference, a date in the house
  date format, the ordered lines, and a total matching the cart's subtotal.
- The cart is empty after a successful order, and the masthead indicator shows nothing.
- Reloading the confirmation shows the same order and issues no further order request.
- Opening the confirmation address directly, with nothing stored, shows its empty state.
- The order request is rejected when it carries an unknown item code, an out-of-stock item, a
  quantity of zero, a negative quantity, a fractional quantity, a quantity above the maximum,
  duplicate item codes, or no items — each returning the house error envelope with a code and a
  message, and no other keys.
- A total sent in the request body does not affect the total in the response.
- The response body of a rejected order contains no file path and no stack trace.
- Every new page renders the house header: an eyebrow, a level-one heading, and a non-empty
  subtitle.
- Each new segment's own loading, error and not-found states render the house header and a real
  state message with guidance.
- The new pages produce no console errors while rendering.
- The existing root, category, item, not-found and rates tests continue to pass unchanged.

**Unit** — None. There is no unit test layer in this project. The line and total arithmetic and the
validation rules are the natural candidates and are covered through the interface instead; section
15 records introducing a unit runner as a follow-up rather than smuggling one in with this feature.

**Frontend** — None as a separate layer; there is no component test harness. The cart's client-held
state, its three states and the form's behaviour are covered end to end above.

**Manual**

- The whole flow has been walked in a browser, not only asserted in a test, as the project's
  definition of done requires.
- The cart page, the checkout page and the confirmation read as the same system as the category and
  item pages, rather than as three pages by three authors.
- The cart page holds together at a narrow viewport, with the line image, the quantity controls and
  the line total all usable.
- The first paint of the cart page does not flash an empty state before the stored cart is read —
  the loading state is what appears, and the transition is not jarring.
- A private window, where browser storage may refuse to persist, degrades to a stated state rather
  than a broken page.
- Keyboard-only operation of the quantity controls and the form is workable, and the focus move on
  a rejected submission lands somewhere sensible.

## 13. Acceptance criteria

- [ ] An item can be added to the cart from its detail page, and the masthead indicator reflects the
      total number of items including quantities.
- [ ] Adding an item already in the cart raises its quantity rather than adding a second line.
- [ ] An out-of-stock item cannot be added, and its detail page says why.
- [ ] The cart survives navigation, a reload, and a closed and reopened browser.
- [ ] The cart page lists each line with its name, image, unit price, quantity and line total, and a
      subtotal equal to the sum of the line totals.
- [ ] A line's quantity can be changed within the permitted range and a line can be removed, with
      the subtotal following both.
- [ ] The cart page and the checkout page each show an approximate total in the secondary currency,
      obtained through the existing exchange-rate route handler and no other way.
- [ ] A cart line whose item is missing from the catalogue or out of stock is marked unavailable,
      excluded from the subtotal, and blocks checkout until removed.
- [ ] Checkout collects the five delivery fields, rejects a blank or whitespace-only value in any of
      them, and names the field at fault without discarding what was typed.
- [ ] Checkout cannot be completed with an empty cart, and shows the empty state rather than a form.
- [ ] The order total in the response is computed by the route handler from the catalogue's prices,
      and a total sent by the client has no effect on it.
- [ ] A successful order reaches a confirmation showing an order reference, the order date, the
      ordered lines, and the server's total.
- [ ] The cart is empty after a successful order.
- [ ] Reloading or revisiting the confirmation shows no duplicate order and issues no second
      request; opening it with nothing stored shows its empty state.
- [ ] The order handler returns `{ error: { code, message } }` and nothing else on every failure,
      using the existing bad-request code for every rejection except an unavailable item, which uses
      the one code this feature adds.
- [ ] A rejection for an unavailable item returns the visitor to the cart, where it can be removed;
      every other rejection leaves them on checkout with what they typed intact.
- [ ] Quantity is capped at ten per line and the cart at twenty lines, enforced in the browser and
      again in the handler.
- [ ] The error envelope and its list of codes no longer live in the module named for the
      exchange-rate route; that route and its client import them from the shared module instead.
- [ ] The checkout page states, above the delivery fields, that this is a demonstration shop and
      that no order will be dispatched, and the confirmation says the same.
- [ ] The order response carries no delivery details, none are written to browser storage, and no
      address is shown back on the confirmation.
- [ ] The masthead carries the cart indicator and no other link; the wordmark is still not a link.
- [ ] All three new pages carry the same eyebrow, and it is not one the catalogue pages use.
- [ ] The order handler makes no outbound HTTP call, reads no environment variable, and logs no part
      of the request body.
- [ ] Every new page renders the house page header component and writes no heading markup of its
      own.
- [ ] Every new list and every new page state uses the house state treatment, with guidance and,
      where a failure can be retried, a retry — no bare spinner and no bare "empty".
- [ ] Each new route segment owns its own loading, error and not-found states.
- [ ] Every amount on every new page renders through the house money formatter, and every date
      through the house date formatter. No `toFixed`, no `Intl`, no currency symbol.
- [ ] Every new image uses the framework's image component with alt text and explicit width and
      height taken from the catalogue.
- [ ] Item data is read only through the existing catalogue accessors; the JSON is not imported
      directly and no new accessor duplicates one that exists.
- [ ] `data/catalogue.json`, the catalogue types and the catalogue validator are unchanged.
- [ ] No new runtime dependency is added.
- [ ] The project rule file has been updated where this feature makes it untrue — in particular its
      claim about which components run on the client.
- [ ] `npm run typecheck` reports zero errors.
- [ ] `npm run lint` reports zero errors, including the rule against setting state synchronously in
      an effect.
- [ ] `npm run build` succeeds.
- [ ] `npm test` passes in full, with new coverage for every new page and every new state.
- [ ] The `site-reviewer` subagent has been run and reports no blocking findings.
- [ ] The whole flow has been seen working in a browser.

## 14. Open questions

The questions this spec opened with have been settled and their answers written into the sections
above rather than left here: the envelope gains no field identifier and exactly one code, and moves
to a shared module; the confirmation is its own segment; items are added from the detail page only;
quantity is capped at ten and the cart at twenty lines; the masthead gains the cart indicator and no
other link; all three pages share one eyebrow; delivery details are not persisted anywhere; and the
reference is minted but accompanied by a plain statement that nothing is stored or dispatched.

What remains open are three things that the decisions above created and that cannot honestly be
settled from a document.

| Question | Options | Owner |
|---|---|---|
| How do the masthead indicator and the cart page stay in step within a single tab? An add on the item page must move the indicator without a navigation, so something has to carry the change between two components that do not share a parent below the root. | A provider around the whole app, which is the conventional answer but makes the root layout a client tree and would cost every page its server rendering; or independent readers that subscribe to a change the cart module broadcasts, which keeps the pages as they are at the cost of a small mechanism to write and test. The second preserves what the site already has and is the presumption unless the plan finds it unworkable. | The implementation plan |
| Does the cart indicator appear on checkout and on the confirmation, where it is redundant and, on the confirmation, invites a loop back into a cart that was just emptied? | Show it everywhere, which is simplest and most predictable; or suppress it within the order flow, which is tidier but makes the masthead conditional. Worth deciding on seeing the pages render rather than in advance. | Project owner |
| Is one statement on the checkout page enough to stop someone typing a real address, or should the fields themselves be relaxed — accepting anything non-blank, which is already the rule — and labelled as a demonstration? | The statement alone, trusting the visitor to read it; or a visible marking on the fieldset as well. This is the one place the site asks for personal data, so the bar for being understood is higher than elsewhere. | Project owner |

## 15. Out of scope and follow-ups

- Payment, in any form. It is the obvious next thing and the brief excludes it deliberately.
- Persisted orders, which need storage the project does not have. This is the point at which the
  committed-JSON decision would have to be revisited, and it would change the shape of the whole
  feature rather than extending it.
- Order history and order lookup by reference, both of which depend on persistence.
- Email confirmation, which depends on persistence and on a mail provider and its key.
- Stock levels and reservation, which would replace the `inStock` boolean with a number and
  therefore change the data shape, the types and the validator together.
- Discount codes, tax and shipping cost, each of which adds a line to the total and a rule about
  how it is computed.
- Saved delivery details and, beyond that, accounts — the point at which a cart could follow a
  person between devices instead of belonging to a browser.
- Live synchronisation of the cart between open tabs.
- Site-wide navigation and breadcrumbs, still deferred from the previous feature and made more
  awkward by this one, which adds the masthead's first link.
- Adding items from the category listing, considered and set aside: it would turn every card in the
  grid into a client component and cost the listing its static rendering, for a convenience the
  detail page already provides.
- A unit test runner, which the arithmetic and validation in this feature are the first real
  argument for.
- Paging the cart page, if the line cap is ever raised far enough to need it.
