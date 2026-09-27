"use client";

import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";

export default function ConfirmationError({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <PageHeader
        eyebrow="Order"
        title="Your order could not be shown"
        subtitle="Something went wrong while displaying what you ordered."
      />
      <StateMessage
        tone="error"
        title="The confirmation did not load"
        guidance="Your order was placed — nothing about it depends on this page rendering, and nothing was charged in any case, because this is a demonstration shop. Try again, or browse the categories."
        action={
          <button type="button" className="button" onClick={reset}>
            Try again
          </button>
        }
      />
    </>
  );
}
