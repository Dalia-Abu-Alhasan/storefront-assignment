import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";

export default function CartNotFound() {
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
        guidance="Your cart is at /cart. Browse the categories and add something to it."
        action={
          <Link className="button" href="/">
            Browse categories
          </Link>
        }
      />
    </>
  );
}
