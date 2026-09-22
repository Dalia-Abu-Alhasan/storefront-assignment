"use client";

import { useState } from "react";

import { add, useCart } from "@/lib/cart";
import { MAX_LINES, MAX_PER_LINE } from "@/lib/checkout";

/**
 * The add control on an item's detail page. It adds and says what happened —
 * no navigation, no router call, so the reader keeps their place.
 *
 * Cap outcomes arrive as `add()`'s return value and are held here in local
 * state, set from the click handler, which is why no effect is involved.
 */
export function AddToCart({ sku, inStock }: { sku: string; inStock: boolean }) {
  const cart = useCart();
  const [outcome, setOutcome] = useState("");

  const inCart =
    cart.status === "loading" ? 0 : (cart.items.find((line) => line.sku === sku)?.quantity ?? 0);
  const atCap = inCart >= MAX_PER_LINE;

  function onAdd() {
    const result = add(sku);
    if (result === "quantity-limit") {
      setOutcome(`That is the most of one item a cart can hold (${MAX_PER_LINE}).`);
    } else if (result === "line-limit") {
      setOutcome(`Your cart already holds ${MAX_LINES} different items. Remove one first.`);
    } else {
      // The count makes the text differ on every add, so the live region has
      // something new to announce rather than repeating one unchanged string.
      setOutcome(`Added — ${inCart + 1} in your cart.`);
    }
  }

  const note = !inStock
    ? "This item is out of stock, so it cannot be added."
    : atCap
      ? `That is the most of one item a cart can hold (${MAX_PER_LINE}).`
      : outcome;

  // The cart page says this too; said here so it is not news at checkout.
  const storageNote =
    cart.status === "unavailable"
      ? "Your browser is blocking storage, so the cart will not survive a reload."
      : "";

  return (
    <div className="add-to-cart">
      <button
        type="button"
        className="button"
        onClick={onAdd}
        disabled={!inStock || atCap}
      >
        Add to cart
      </button>
      <p className="add-to-cart__note" aria-live="polite">
        {[note, storageNote].filter(Boolean).join(" ")}
      </p>
    </div>
  );
}
