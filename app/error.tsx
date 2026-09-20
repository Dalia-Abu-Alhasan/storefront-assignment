"use client";

import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <PageHeader
        eyebrow="Error"
        title="Something went wrong"
        subtitle="The page could not be rendered."
      />
      <StateMessage
        tone="error"
        title="This page did not load"
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
