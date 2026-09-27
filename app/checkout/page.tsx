import type { Metadata } from "next";

import { CheckoutForm } from "@/components/CheckoutForm";
import { PageHeader } from "@/components/PageHeader";
import { buildCartLookup } from "@/lib/cart-lookup";

export const metadata: Metadata = {
  title: "Checkout — Aurora Supply Co.",
  description: "Supply your delivery details to place a demonstration order.",
};

/**
 * A server component, like the cart page: it supplies the prices for the
 * read-only summary and leaves the cart itself to the client leaf. The order is
 * priced authoritatively by `POST /api/checkout`, not here.
 */
export default function CheckoutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Order"
        title="Checkout"
        subtitle="Check what you are ordering and tell us where it would go."
      />
      <CheckoutForm lookup={buildCartLookup()} />
    </>
  );
}
