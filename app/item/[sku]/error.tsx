"use client";

import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";

export default function ItemError({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <PageHeader
        eyebrow="Item"
        title="This item could not be loaded"
        subtitle="Something went wrong while reading the catalogue."
      />
      <StateMessage
        tone="error"
        title="The item did not load"
        guidance="This is usually temporary. Try again, and if it persists the catalogue data may be invalid."
        action={
          <button type="button" className="button" onClick={reset}>
            Try again
          </button>
        }
      />
    </>
  );
}
