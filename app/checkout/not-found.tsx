import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";

export default function CheckoutNotFound() {
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
        guidance="Checkout is at /checkout, and it starts from your cart. Open your cart to order what is in it."
        action={
          <Link className="button" href="/cart">
            Open your cart
          </Link>
        }
      />
    </>
  );
}
