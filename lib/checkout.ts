/**
 * The shared checkout contract: the constants and types the cart store, the
 * client components and the checkout route handler all agree on.
 *
 * This module carries no directive on purpose. `app/api/checkout/route.ts` is a
 * server module and imports the same constants; importing a non-function
 * binding from a `"use client"` module into server code yields a client
 * reference rather than the value.
 */

/** Bumped when the stored shape changes. A mismatch discards the stored cart. */
export const CART_VERSION = 1;

/** At most this many distinct items in one cart. */
export const MAX_LINES = 20;

/** At most this many of any one item. */
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
