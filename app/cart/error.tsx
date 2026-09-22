"use client";

import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";

export default function CartError({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <PageHeader
        eyebrow="Order"
        title="Your cart could not be shown"
        subtitle="Something went wrong while pricing the lines in your cart."
      />
      <StateMessage
        tone="error"
        title="The cart did not load"
        guidance="Nothing has been lost — what you added is still in this browser. Try again, and if it keeps happening the catalogue data may be invalid."
        action={
          <button type="button" className="button" onClick={reset}>
            Try again
          </button>
        }
      />
    </>
  );
}
