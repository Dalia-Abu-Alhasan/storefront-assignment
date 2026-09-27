"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { ConvertedPrice } from "@/components/ConvertedPrice";
import { StateMessage } from "@/components/StateMessage";
import { clear, reload, useCart } from "@/lib/cart";
import {
  SHIPPING_FIELDS,
  type CartLookup,
  type CheckoutRequest,
  type OrderResponse,
  type Shipping,
} from "@/lib/checkout";
import { isErrorEnvelope } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { place } from "@/lib/order";

const SECONDARY_CURRENCY = "USD";

/**
 * A client-side bound on the submit. Not house rule 5's five seconds — that
 * governs a *handler's* outbound calls, and this is a browser calling our own
 * route. Without it, a request that never settles leaves the button disabled
 * and the status stuck on "Placing your order." with nothing but a reload to
 * get out of.
 */
const SUBMIT_TIMEOUT_MS = 10_000;

/**
 * The keys and labels come from the shared contract, which the route handler
 * imports too — that is what lets a server rejection be mapped back onto the
 * field it names. Only the input attributes below are this form's own.
 */
const INPUT: Record<keyof Shipping, { type: "text" | "tel"; autoComplete: string }> = {
  fullName: { type: "text", autoComplete: "name" },
  addressLine: { type: "text", autoComplete: "street-address" },
  city: { type: "text", autoComplete: "address-level2" },
  postalCode: { type: "text", autoComplete: "postal-code" },
  phone: { type: "tel", autoComplete: "tel" },
};

const BLANK: Shipping = { fullName: "", addressLine: "", city: "", postalCode: "", phone: "" };

type FieldErrors = Partial<Record<keyof Shipping, string>>;

/**
 * Checkout: the read-only order summary, the delivery form, and the request
 * that places the order.
 *
 * Prices arrive as a prop from the server component, as they do on the cart
 * page, so the summary needs no request and the route stays statically
 * generated. The total shown here is a preview; the authoritative one is
 * computed by the checkout handler from the catalogue's own prices.
 *
 * The client's validation rules mirror the handler's exactly. Where they could
 * drift the server wins, and a server rejection naming a field is put back onto
 * that field rather than shown as a bare form error.
 */
export function CheckoutForm({ lookup }: { lookup: CartLookup }) {
  const cart = useCart();
  const router = useRouter();

  const [values, setValues] = useState<Shipping>(BLANK);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [blockedMessage, setBlockedMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /**
   * Set the moment an order succeeds, and never unset. Clearing the cart is
   * what empties it, and without this the form would re-render into its own
   * empty state — "There is nothing to check out" — for the frame or two
   * before the push to the confirmation lands.
   */
  const [leaving, setLeaving] = useState(false);

  const inputs = useRef<Partial<Record<keyof Shipping, HTMLInputElement | null>>>({});

  /**
   * The only effect in the whole feature, and cleanup-only on purpose: an empty
   * setup body leaves no setState for `react-hooks/set-state-in-effect` to
   * flag, and the abort is itself the cleanup.
   */
  const inFlight = useRef<AbortController | null>(null);
  useEffect(() => () => inFlight.current?.abort(), []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setFormError("");
    setBlockedMessage("");

    // The same five rules the handler enforces, so a visitor hears about a
    // blank field before anything is sent.
    const errors: FieldErrors = {};
    for (const field of SHIPPING_FIELDS) {
      if (values[field.key].trim().length === 0) errors[field.key] = field.label + " is required.";
    }
    setFieldErrors(errors);

    const firstBad = SHIPPING_FIELDS.find((field) => errors[field.key] !== undefined);
    if (firstBad) {
      inputs.current[firstBad.key]?.focus();
      return;
    }

    // Re-read storage on submit, so the order is the cart as it is now rather
    // than as it was when this page rendered.
    const snapshot = reload();
    const items = snapshot.status === "loading" ? [] : [...snapshot.items];
    if (items.length === 0) return; // The empty state takes over on the next render.

    const shipping = Object.fromEntries(
      SHIPPING_FIELDS.map((field) => [field.key, values[field.key].trim()]),
    ) as Shipping;

    setSubmitting(true);
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    try {
      const body: CheckoutRequest = { items, shipping };
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(SUBMIT_TIMEOUT_MS)]),
      });
      const payload: unknown = await response.json();

      if (!response.ok || isErrorEnvelope(payload)) {
        if (!isErrorEnvelope(payload)) {
          setFormError(
            "Your order was not accepted. Submit again, and if it keeps happening reload your cart.",
          );
          return;
        }

        if (payload.error.code === "ITEM_UNAVAILABLE") {
          // Only the cart page can fix this, so that is where the control goes.
          setBlockedMessage(payload.error.message);
          return;
        }

        // Reachable only if the two rule sets have drifted. Put the message on
        // the field it names, so the reason is reachable without hunting.
        const named = SHIPPING_FIELDS.find((field) =>
          payload.error.message.startsWith(field.label + " "),
        );
        if (named) {
          setFieldErrors({ [named.key]: payload.error.message });
          inputs.current[named.key]?.focus();
          return;
        }

        setFormError(payload.error.message);
        return;
      }

      // In this order. Writing before clearing means a write that fails loses
      // nothing; clearing first would lose the order instead of the cart.
      setLeaving(true);
      place(payload as OrderResponse);
      clear();
      router.push("/checkout/confirmation");
    } catch (cause) {
      // The component unmounted mid-flight; there is nobody to tell.
      if (controller.signal.aborted) return;

      setFormError(
        cause instanceof DOMException && cause.name === "TimeoutError"
          ? "Your order took too long to send, so it was stopped. Nothing was ordered — submit again."
          : "Your order could not be sent. Check your connection and submit again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.status === "loading" || leaving) {
    return (
      <ul
        className="grid"
        aria-busy="true"
        aria-label={leaving ? "Placing your order" : "Loading checkout"}
      >
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
        title="There is nothing to check out"
        guidance="Your cart is empty, so there is no order to place. Browse the categories, open an item and add it from its page."
        action={
          <Link className="button" href="/">
            Browse categories
          </Link>
        }
      />
    );
  }

  const priced = cart.items.map((line) => ({ line, info: lookup[line.sku] }));
  const blocked = priced.filter(({ info }) => info === undefined || !info.inStock);

  // The client's copy of the handler's item rules. Reaching checkout with a
  // blocked line means arriving here directly, or stock changing under a cart
  // built earlier — either way the cart page is the only place to fix it.
  if (blocked.length > 0) {
    return (
      <StateMessage
        tone="error"
        title="Some lines cannot be ordered"
        guidance={
          "Your cart holds " +
          blocked.map(({ line, info }) => info?.name ?? line.sku).join(", ") +
          ", which cannot be ordered. Remove them in your cart and come back."
        }
        action={
          <Link className="button" href="/cart">
            Back to your cart
          </Link>
        }
      />
    );
  }

  /** Integer cents, by the same rule the handler uses, so the two agree. */
  const subtotalCents = priced.reduce(
    (total, { line, info }) =>
      info === undefined ? total : total + Math.round(info.priceEur * 100) * line.quantity,
    0,
  );
  const subtotalEur = subtotalCents / 100;

  return (
    <div className="checkout">
      <section className="summary" aria-labelledby="summary-heading">
        <h2 className="summary__heading" id="summary-heading">
          What you are ordering
        </h2>
        <ul className="summary__lines">
          {priced.map(({ line, info }) => (
            <li className="summary__line" key={line.sku}>
              <span className="summary__name">{info?.name ?? line.sku}</span>
              <span className="summary__quantity">
                {line.quantity} &times; {formatMoney(info?.priceEur ?? 0, "EUR")}
              </span>
              <span className="summary__amount">
                {formatMoney(
                  (Math.round((info?.priceEur ?? 0) * 100) * line.quantity) / 100,
                  "EUR",
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="summary__total">
          <span>Total</span>
          <span className="summary__total-amount">{formatMoney(subtotalEur, "EUR")}</span>
        </p>
        <ConvertedPrice
          priceEur={subtotalEur}
          target={SECONDARY_CURRENCY}
          className="summary__converted"
        />
        <Link className="summary__back" href="/cart">
          Change your cart
        </Link>
      </section>

      {/* The banner and the form share one column. Left as siblings of
          `.summary`, the banner is auto-placed into the grid's second row —
          i.e. below the whole form, where nobody is looking after pressing
          Place order. */}
      <div className="checkout__main">
        {blockedMessage ? (
          <StateMessage
            tone="error"
            title="Your order was not placed"
            guidance={blockedMessage}
            action={
              <Link className="button" href="/cart">
                Back to your cart
              </Link>
            }
          />
        ) : null}

        <form className="form" noValidate onSubmit={onSubmit}>
        {/*
          Above the fields, not only on the confirmation afterwards: the form
          asks for a real name, address and telephone number, and nobody should
          supply one under a misapprehension about what this site is.
        */}
        <p className="form__notice">
          This is a demonstration shop. No payment is taken and no order is dispatched, so there is
          no need to give a real name, address or telephone number.
        </p>

        <fieldset className="fieldset">
          <legend className="fieldset__legend">Delivery details</legend>

          {SHIPPING_FIELDS.map((field) => {
            const message = fieldErrors[field.key];

            return (
              <div className="field" key={field.key}>
                <label className="field__label" htmlFor={field.key}>
                  {field.label}
                </label>
                <input
                  className="field__input"
                  id={field.key}
                  name={field.key}
                  type={INPUT[field.key].type}
                  autoComplete={INPUT[field.key].autoComplete}
                  required
                  value={values[field.key]}
                  aria-invalid={message === undefined ? undefined : true}
                  aria-describedby={message === undefined ? undefined : field.key + "-error"}
                  ref={(node) => {
                    inputs.current[field.key] = node;
                  }}
                  onChange={(event) => {
                    const next = event.target.value;
                    setValues((current) => ({ ...current, [field.key]: next }));
                    setFieldErrors((current) => ({ ...current, [field.key]: undefined }));
                  }}
                />
                <p className="field__error" id={field.key + "-error"} role="alert">
                  {message ?? ""}
                </p>
              </div>
            );
          })}
        </fieldset>

        {formError ? (
          <StateMessage
            tone="error"
            title="Your order was not placed"
            guidance={formError}
            action={
              <button type="submit" className="button" disabled={submitting}>
                Submit again
              </button>
            }
          />
        ) : null}

        <div className="form__actions">
          <button type="submit" className="button" disabled={submitting}>
            {submitting ? "Placing your order…" : "Place order"}
          </button>
            <p className="form__status" aria-live="polite">
              {submitting ? "Placing your order." : ""}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
