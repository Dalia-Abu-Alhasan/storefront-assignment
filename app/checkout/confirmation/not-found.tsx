import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";

export default function ConfirmationNotFound() {
  return (
    <>
      <PageHeader
        eyebrow="Order"
        title="No such page"
        subtitle="The address you followed is not part of the order flow."
      />
      <StateMessage
        tone="empty"
        title="There is nothing at this address"
        guidance="A confirmation is not something you can look up — an order is not kept after the response that created it. Browse the categories to start a new one."
        action={
          <Link className="button" href="/">
            Browse categories
          </Link>
        }
      />
    </>
  );
}
