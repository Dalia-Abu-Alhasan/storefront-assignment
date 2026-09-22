"use client";

import { useSyncExternalStore } from "react";

import {
  CART_KEY,
  CART_VERSION,
  MAX_LINES,
  MAX_PER_LINE,
  type CartLine,
  type StoredCart,
} from "@/lib/checkout";

/**
 * The cart: a module-level external store over `localStorage`, read with
 * `useSyncExternalStore`.
 *
 * It is deliberately not a context provider or an effect-synchronised hook.
 * React calls `getServerSnapshot` during server render and hydration and
 * `getSnapshot` only afterwards, so server and client output agree by
 * construction and no consumer needs a `useEffect`.
 *
 * The `"use client"` directive makes importing this module from a server
 * component a build error, which is exactly the mistake worth catching early.
 *
 * Every failure path resolves to a snapshot. Nothing here throws, and every
 * `catch` stays silent: `getSnapshot` throwing would send React into a render
 * loop, and a stray `console.error` would fail the suite's console assertions.
 */

export type CartSnapshot =
  | { status: "loading" }
  | { status: "ready"; items: readonly CartLine[] }
  | { status: "unavailable"; items: readonly CartLine[] };

/**
 * Frozen module-level constants. `getServerSnapshot` must return the same
 * object on every call or React warns about an uncached snapshot and loops.
 */
const LOADING: CartSnapshot = Object.freeze({ status: "loading" });
const NO_ITEMS: readonly CartLine[] = Object.freeze([]);

let snapshot: CartSnapshot = LOADING;
let loaded = false;

const listeners = new Set<() => void>();

/* --- reading ----------------------------------------------------------- */

function readStorage(): { readable: true; raw: string | null } | { readable: false } {
  try {
    return { readable: true, raw: window.localStorage.getItem(CART_KEY) };
  } catch {
    // Storage is blocked (a private window, or a browser setting).
    return { readable: false };
  }
}

function discard(): void {
  try {
    window.localStorage.removeItem(CART_KEY);
  } catch {
    // Nothing to discard if storage will not answer.
  }
}

/**
 * Parses and sanitises a stored payload. `null` means the whole payload is
 * unusable and should be discarded; individual bad entries are skipped instead.
 *
 * A sku that is not in the catalogue is not checked here — the store does not
 * know the catalogue. The cart page and the checkout handler each catch that
 * independently.
 */
function readItems(raw: string): CartLine[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const { version, items } = parsed as Partial<StoredCart>;

  // The one migration hook. A future v2 translates here instead of discarding.
  if (version !== CART_VERSION) return null;
  if (!Array.isArray(items)) return null;

  const lines: CartLine[] = [];
  const seen = new Set<string>();

  for (const entry of items) {
    if (lines.length >= MAX_LINES) break;
    if (typeof entry !== "object" || entry === null) continue;

    const { sku, quantity } = entry as Partial<CartLine>;
    if (typeof sku !== "string" || sku.length === 0 || seen.has(sku)) continue;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) continue;

    seen.add(sku);
    lines.push({ sku, quantity: Math.min(quantity, MAX_PER_LINE) });
  }

  return lines;
}

function load(): void {
  loaded = true;

  const read = readStorage();
  if (!read.readable) {
    // Keep whatever is held in memory. With storage blocked the cart still
    // works for this page view, and `reload()` must not be the thing that
    // empties it — checkout calls `reload()` on submit.
    snapshot = {
      status: "unavailable",
      items: snapshot.status === "loading" ? NO_ITEMS : snapshot.items,
    };
    return;
  }
  if (read.raw === null) {
    snapshot = { status: "ready", items: NO_ITEMS };
    return;
  }

  const items = readItems(read.raw);
  if (items === null) {
    discard();
    snapshot = { status: "ready", items: NO_ITEMS };
    return;
  }

  snapshot = { status: "ready", items };
}

function getSnapshot(): CartSnapshot {
  // The `window` guard matters: this module singleton outlives a request in the
  // running server, and no request may leave a non-loading value for the next.
  if (!loaded && typeof window !== "undefined") load();
  return snapshot;
}

function getServerSnapshot(): CartSnapshot {
  return LOADING;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCart(): CartSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* --- writing ----------------------------------------------------------- */

function writeStorage(items: readonly CartLine[]): boolean {
  try {
    const payload: StoredCart = { version: CART_VERSION, items: [...items] };
    window.localStorage.setItem(CART_KEY, JSON.stringify(payload));
    return true;
  } catch {
    // Blocked storage, or over quota. The mutation still applies in memory.
    return false;
  }
}

/**
 * The single write path. It always assigns a new snapshot object so `Object.is`
 * differs, then notifies every listener synchronously — which is the whole
 * same-tab notification mechanism. Running inside a click handler means React
 * batches the masthead and any open cart list into one commit.
 *
 * There is deliberately no `storage` event listener: live cross-tab sync is out
 * of scope.
 */
function commit(items: readonly CartLine[]): void {
  const stored = writeStorage(items);
  snapshot = { status: stored ? "ready" : "unavailable", items };
  for (const listener of listeners) listener();
}

function currentItems(): readonly CartLine[] {
  const current = getSnapshot();
  return current.status === "loading" ? NO_ITEMS : current.items;
}

/* --- mutators ---------------------------------------------------------- */

/**
 * Cap outcomes come back as a return value rather than as store state, so the
 * message belongs to the control that was pressed and lives in its own
 * `useState`, set from an event handler.
 */
export type AddResult = "added" | "line-limit" | "quantity-limit";

export function add(sku: string, quantity = 1): AddResult {
  const items = currentItems();
  const existing = items.find((line) => line.sku === sku);

  if (existing) {
    const next = Math.min(existing.quantity + quantity, MAX_PER_LINE);
    if (next === existing.quantity) return "quantity-limit";
    commit(items.map((line) => (line.sku === sku ? { sku, quantity: next } : line)));
    return "added";
  }

  if (items.length >= MAX_LINES) return "line-limit";

  commit([...items, { sku, quantity: Math.min(quantity, MAX_PER_LINE) }]);
  return "added";
}

/** A quantity of zero or less is a removal. */
export function setQuantity(sku: string, quantity: number): void {
  const items = currentItems();
  const existing = items.find((line) => line.sku === sku);
  if (!existing) return;

  if (quantity <= 0) {
    commit(items.filter((line) => line.sku !== sku));
    return;
  }

  const next = Math.min(Math.trunc(quantity), MAX_PER_LINE);
  if (next === existing.quantity) return;

  commit(items.map((line) => (line.sku === sku ? { sku, quantity: next } : line)));
}

export function remove(sku: string): void {
  const items = currentItems();
  if (!items.some((line) => line.sku === sku)) return;
  commit(items.filter((line) => line.sku !== sku));
}

export function clear(): void {
  if (currentItems().length === 0) return;
  commit(NO_ITEMS);
}

/** Re-reads storage. Checkout calls this on submit so the order reflects now. */
export function reload(): CartSnapshot {
  loaded = false;
  const next = getSnapshot();
  for (const listener of listeners) listener();
  return next;
}

export function countItems(items: readonly CartLine[]): number {
  return items.reduce((total, line) => total + line.quantity, 0);
}
