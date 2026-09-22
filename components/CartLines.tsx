"use client";

import Image from "next/image";
import Link from "next/link";

import { ConvertedPrice } from "@/components/ConvertedPrice";
import { StateMessage } from "@/components/StateMessage";
import { countItems, remove, setQuantity, useCart } from "@/lib/cart";
import { MAX_PER_LINE, type CartLookup } from "@/lib/checkout";
import { formatMoney } from "@/lib/format";

const SECONDARY_CURRENCY = "USD";

/**
 * The cart's four states, its quantity controls and its subtotal.
 *
 * Prices come in as a prop from the server component rather than from a
 * request, so there is no waterfall and `/cart` stays statically generated.
 * The cart itself is read from the store, which is why this is a client leaf.
 */
export function CartLines({ lookup }: { lookup: CartLookup }) {
  const cart = useCart();

  if (cart.status === "loading") {
    return (
      <ul className="grid" aria-busy="true" aria-label="Loading your cart">
        {[0, 1, 2].map((key) => (
          <li key={key} className="skeleton skeleton--card-compact" />
        ))}
      </ul>
    );
  }

  if (cart.items.length === 0) {
    return (
      <StateMessage
        tone="empty"
        title="Your cart is empty"
        guidance="Nothing has been added yet. Browse the categories, open an item and add it from its page."
        action={
          <Link className="button" href="/">
            Browse categories
          </Link>
        }
      />
    );
  }

  const priced = cart.items.map((line) => ({ line, info: lookup[line.sku] }));

  // A line is blocked when its sku has left the catalogue or its item is out of
  // stock. The store cannot know either — it does not see the catalogue — so
  // this is the first of the two independent checks; the handler is the second.
  const blocked = priced.filter(({ info }) => info === undefined || !info.inStock);

  /**
   * Integer cents throughout. `priceEur` is a float, and summing floats risks a
   * penny of drift that `formatMoney` would faithfully render. The checkout
   * handler follows the identical rule, so this preview and the authoritative
   * total agree.
   */
  const subtotalCents = priced.reduce(
    (total, { line, info }) =>
      info !== undefined && info.inStock
        ? total + Math.round(info.priceEur * 100) * line.quantity
        : total,
    0,
  );
  const subtotalEur = subtotalCents / 100;

  const orderable = countItems(
    priced.filter(({ info }) => info !== undefined && info.inStock).map(({ line }) => line),
  );

  return (
    <div className="cart">
      {cart.status === "unavailable" ? (
        <StateMessage
          tone="error"
          title="This cart will not be saved"
          guidance="Your browser is blocking storage, so these lines will be gone if you reload or come back later. Allow storage for this site, or order now."
        />
      ) : null}

      {blocked.length > 0 ? (
        <StateMessage
          tone="error"
          title="Some lines cannot be ordered"
          guidance={`Remove ${blocked
            .map(({ line, info }) => info?.name ?? line.sku)
            .join(", ")} to continue to checkout.`}
          action={
            <button
              type="button"
              className="button"
              onClick={() => {
                for (const { line } of blocked) remove(line.sku);
              }}
            >
              Remove unavailable
            </button>
          }
        />
      ) : null}

      <ul className="cart__lines">
        {priced.map(({ line, info }) => {
          const sellable = info !== undefined && info.inStock;

          return (
            <li className="cart__line" key={line.sku}>
              {info ? (
                <Image
                  className="cart__image"
                  src={info.image.src}
                  alt={info.image.alt}
                  width={info.image.width}
                  height={info.image.height}
                />
              ) : (
                <div className="cart__image cart__image--missing" aria-hidden="true" />
              )}

              <div className="cart__line-body">
                <h2 className="cart__name">
                  {info ? (
                    <Link href={`/item/${line.sku}`}>{info.name}</Link>
                  ) : (
                    line.sku
                  )}
                </h2>

                {sellable && info ? (
                  <>
                    <p className="cart__unit">
                      {formatMoney(info.priceEur, info.currency)} each
                    </p>
                    <div className="cart__quantity">
                      <button
                        type="button"
                        className="cart__step"
                        aria-label={`One fewer ${info.name}`}
                        disabled={line.quantity <= 1}
                        onClick={() => setQuantity(line.sku, line.quantity - 1)}
                      >
                        &minus;
                      </button>
                      <span className="cart__quantity-value">{line.quantity}</span>
                      <button
                        type="button"
                        className="cart__step"
                        aria-label={`One more ${info.name}`}
                        disabled={line.quantity >= MAX_PER_LINE}
                        onClick={() => setQuantity(line.sku, line.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="cart__gone">
                    {info
                      ? "This item is out of stock, so it cannot be ordered."
                      : "This item is no longer in the catalogue."}{" "}
                    Remove it to continue.
                  </p>
                )}
              </div>

              <div className="cart__line-end">
                {sellable && info ? (
                  <p className="cart__line-total">
                    {formatMoney(
                      (Math.round(info.priceEur * 100) * line.quantity) / 100,
                      info.currency,
                    )}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="button button--quiet"
                  aria-label={`Remove ${info?.name ?? line.sku}`}
                  onClick={() => remove(line.sku)}
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="cart__summary">
        <p className="cart__subtotal">
          <span>Subtotal</span>
          <span className="cart__subtotal-amount">{formatMoney(subtotalEur, "EUR")}</span>
        </p>
        <ConvertedPrice
          priceEur={subtotalEur}
          target={SECONDARY_CURRENCY}
          className="cart__converted"
        />
        <p className="cart__tally">
          {orderable === 1 ? "1 item" : `${orderable} items`} ready to order.
        </p>

        {blocked.length > 0 ? (
          <button type="button" className="button" disabled>
            Proceed to checkout
          </button>
        ) : (
          /* `prefetch={false}` until `/checkout` is routed — see CartIndicator. */
          <Link className="button" href="/checkout" prefetch={false}>
            Proceed to checkout
          </Link>
        )}
      </div>
    </div>
  );
}
