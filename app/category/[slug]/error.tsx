"use client";

import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";

export default function CategoryError({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <PageHeader
        eyebrow="Category"
        title="This category could not be loaded"
        subtitle="Something went wrong while reading the catalogue."
      />
      <StateMessage
        tone="error"
        title="The catalogue did not load"
        guidance="This is usually temporary. Try again, and if it keeps happening the catalogue data may be invalid."
        action={
          <button type="button" className="button" onClick={reset}>
            Try again
          </button>
        }
      />
    </>
  );
}
