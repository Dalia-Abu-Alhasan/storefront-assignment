"use client";

import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";

export default function CheckoutError({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <PageHeader
        eyebrow="Order"
        title="Checkout could not be shown"
        subtitle="Something went wrong while preparing your order."
      />
      <StateMessage
        tone="error"
        title="Checkout did not load"
        guidance="Nothing has been ordered and your cart is untouched. Try again, and if it keeps happening go back to your cart and start from there."
        action={
          <button type="button" className="button" onClick={reset}>
            Try again
          </button>
        }
      />
    </>
  );
}
