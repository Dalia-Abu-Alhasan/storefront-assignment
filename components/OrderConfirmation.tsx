"use client";

import Link from "next/link";

import { StateMessage } from "@/components/StateMessage";
import { formatDate, formatMoney } from "@/lib/format";
import { useOrder } from "@/lib/order";

/**
 * The confirmation's four states, read from the order store.
 *
 * It renders only what the server returned. The order response carries no
 * delivery details, so no address is shown back — there is nothing here to
 * show it from.
 *
 * Reading the store issues no request, which is what makes a refresh harmless:
 * it cannot place a second order, and nothing is persisted server-side for a
 * second order to duplicate in the first place.
 */
export function OrderConfirmation() {
  const order = useOrder();

  if (order.status === "loading") {
    return (
      <ul className="grid" aria-busy="true" aria-label="Loading your order">
        {[0, 1, 2].map((key) => (
          <li key={key} className="skeleton skeleton--card-compact" />
        ))}
      </ul>
    );
  }

  if (order.status === "unreadable") {
    return (
      <StateMessage
        tone="error"
        title="Your order could not be read"
        guidance="What this browser had stored about your last order was not something we could make sense of, so it has been discarded. Nothing was charged and nothing was dispatched — this is a demonstration shop. Browse the categories to start again."
        action={
          <Link className="button" href="/">
            Browse categories
          </Link>
        }
      />
    );
  }

  // Landing here cold, or in a later browser session. Not an error and not a
  // not-found: the address is real, there is simply no recent order behind it.
  if (order.status === "empty") {
    return (
      <StateMessage
        tone="empty"
        title="There is no recent order to show"
        guidance="Orders are remembered for this browsing session only, so a bookmarked or shared confirmation lands here. Browse the categories to put something in your cart."
        action={
          <Link className="button" href="/">
            Browse categories
          </Link>
        }
      />
    );
  }

  const { reference, placedOn, lines, totalEur, currency } = order.order;

  return (
    <div className="order">
      {/* The header's title has to read for all four states, so it cannot say
          this. Nothing else on the page does either — the reference and the
          total are evidence of an order, not a statement that it went through. */}
      <p className="order__placed">Your order was placed.</p>

      <dl className="order__meta">
        <dt>Reference</dt>
        <dd className="order__reference">{reference}</dd>
        <dt>Placed</dt>
        <dd>{formatDate(placedOn)}</dd>
      </dl>

      <section className="summary" aria-labelledby="ordered-heading">
        <h2 className="summary__heading" id="ordered-heading">
          What you ordered
        </h2>
        <ul className="summary__lines">
          {lines.map((line) => (
            <li className="summary__line" key={line.sku}>
              <span className="summary__name">{line.name}</span>
              <span className="summary__quantity">
                {line.quantity} &times; {formatMoney(line.unitPriceEur, currency)}
              </span>
              <span className="summary__amount">{formatMoney(line.lineTotalEur, currency)}</span>
            </li>
          ))}
        </ul>
        <p className="summary__total">
          <span>Total</span>
          <span className="summary__total-amount">{formatMoney(totalEur, currency)}</span>
        </p>
      </section>

      <div className="order__actions">
        <Link className="button" href="/">
          Browse categories
        </Link>
      </div>
    </div>
  );
}
