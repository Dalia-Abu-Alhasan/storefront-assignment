"use client";

import { useSyncExternalStore } from "react";

import { ORDER_KEY, type OrderResponse } from "@/lib/checkout";

/**
 * The last order: a module-level external store mirrored to `sessionStorage`,
 * read with `useSyncExternalStore`.
 *
 * The same shape as `lib/cart.ts` on purpose — consistency, and it keeps the
 * whole feature at one `useEffect`. The differences are deliberate:
 *
 * - **The module variable is the primary source.** Checkout writes the order
 *   and then pushes to the confirmation, which is a soft navigation with no
 *   reload, so the value is simply still here. Storage is the fallback that
 *   makes a refresh work.
 * - **Session scope, not local.** That is what makes a refresh show the same
 *   order and a bookmark fall through to the empty state, with no server
 *   involvement and no second request. Nothing is persisted server-side
 *   anyway, so there is no first order for a second to duplicate.
 * - **Blocked storage degrades to "works until you refresh"** rather than to a
 *   blank confirmation, because the module variable carries it either way.
 *
 * `place()` only ever runs in a click handler in the browser, and `getSnapshot`
 * is guarded on `window`, so the module singleton in the running server can
 * never hold one visitor's order into another's request.
 *
 * Every `catch` stays silent, for the same two reasons as the cart: a throw
 * from `getSnapshot` sends React into a render loop, and a stray
 * `console.error` fails the suite's console assertions.
 */

export type OrderSnapshot =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; order: OrderResponse }
  | { status: "unreadable" };

/** Frozen module-level constants: `getServerSnapshot` must return the same
 *  object every call, or React warns about an uncached snapshot and loops. */
const LOADING: OrderSnapshot = Object.freeze({ status: "loading" });
const EMPTY: OrderSnapshot = Object.freeze({ status: "empty" });
const UNREADABLE: OrderSnapshot = Object.freeze({ status: "unreadable" });

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

let snapshot: OrderSnapshot = LOADING;
let loaded = false;

const listeners = new Set<() => void>();

/* --- reading ----------------------------------------------------------- */

/**
 * Validates a stored payload back into an `OrderResponse`.
 *
 * Thorough on purpose: `formatDate` throws on anything that is not an ISO date
 * and `formatMoney` throws on a non-finite number, so a half-checked order
 * would reach the confirmation and take out its error boundary. Checking here
 * is what keeps the unreadable case a *state* rather than a crash.
 */
function readOrder(raw: string): OrderResponse | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const { reference, placedOn, lines, totalEur, currency } = parsed as Partial<OrderResponse>;

  if (typeof reference !== "string" || reference.length === 0) return null;
  if (typeof placedOn !== "string" || !ISO_DATE.test(placedOn)) return null;
  if (currency !== "EUR") return null;
  if (typeof totalEur !== "number" || !Number.isFinite(totalEur)) return null;
  if (!Array.isArray(lines) || lines.length === 0) return null;

  for (const line of lines) {
    if (typeof line !== "object" || line === null) return null;
    const { sku, name, quantity, unitPriceEur, lineTotalEur } = line;
    if (typeof sku !== "string" || sku.length === 0) return null;
    if (typeof name !== "string" || name.length === 0) return null;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) return null;
    if (typeof unitPriceEur !== "number" || !Number.isFinite(unitPriceEur)) return null;
    if (typeof lineTotalEur !== "number" || !Number.isFinite(lineTotalEur)) return null;
  }

  return { reference, placedOn, lines, totalEur, currency };
}

function discard(): void {
  try {
    window.sessionStorage.removeItem(ORDER_KEY);
  } catch {
    // Nothing to discard if storage will not answer.
  }
}

function load(): void {
  loaded = true;

  // An order already in hand came from this page view's own checkout. It beats
  // whatever storage says, and storage may not answer at all.
  if (snapshot.status === "ready") return;

  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(ORDER_KEY);
  } catch {
    // Blocked storage. Nothing was placed in this page view, so there is no
    // order to show — which is the empty state, not a fault.
    snapshot = EMPTY;
    return;
  }

  if (raw === null) {
    snapshot = EMPTY;
    return;
  }

  const order = readOrder(raw);
  if (order === null) {
    // Reported once, honestly, and discarded so a reload recovers to the empty
    // state rather than leaving the visitor stuck on an error they cannot fix.
    discard();
    snapshot = UNREADABLE;
    return;
  }

  snapshot = { status: "ready", order };
}

function getSnapshot(): OrderSnapshot {
  // The `window` guard matters: this module singleton outlives a request in the
  // running server, and no request may leave a non-loading value for the next.
  if (!loaded && typeof window !== "undefined") load();
  return snapshot;
}

function getServerSnapshot(): OrderSnapshot {
  return LOADING;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useOrder(): OrderSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* --- writing ----------------------------------------------------------- */

/**
 * Records the order the server returned. Called on success, before the cart is
 * cleared — clearing first would lose the order if the write threw.
 *
 * The response carries no delivery details, so none reach storage.
 */
export function place(order: OrderResponse): void {
  try {
    window.sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    // Blocked storage, or over quota. The module variable below still carries
    // it, so the confirmation works until the visitor refreshes.
  }

  loaded = true;
  snapshot = { status: "ready", order };
  for (const listener of listeners) listener();
}
