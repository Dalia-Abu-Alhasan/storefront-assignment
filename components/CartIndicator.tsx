"use client";

import Link from "next/link";

import { countItems, useCart } from "@/lib/cart";

/**
 * The masthead's running item count. Shown on every page, with no awareness of
 * which page it is on.
 *
 * The outer `<Link>` is the same element in both branches so the live region
 * survives the loading-to-ready swap; replacing it would replace the live
 * region and the count might never announce. The loading branch shows a
 * skeleton rather than a literal `0`, because a `0` that becomes `3` two frames
 * later reads as an empty cart that was not empty.
 */
export function CartIndicator() {
  const cart = useCart();

  return (
    <Link className="masthead__cart" href="/cart" aria-live="polite">
      Cart{" "}
      {cart.status === "loading" ? (
        <span
          className="skeleton skeleton--line"
          aria-label="Counting your cart"
          style={{ width: "2.5rem", display: "inline-block" }}
        />
      ) : (
        <span className="masthead__cart-count">{countItems(cart.items)}</span>
      )}
    </Link>
  );
}
