import type { Metadata } from "next";

import { CartLines } from "@/components/CartLines";
import { PageHeader } from "@/components/PageHeader";
import { buildCartLookup } from "@/lib/cart-lookup";

export const metadata: Metadata = {
  title: "Your cart — Aurora Supply Co.",
  description: "Review what you have chosen before ordering.",
};

/**
 * A server component. The cart itself lives in the browser, so all this page
 * does is supply the prices: it hands the client list a sku-to-item table built
 * from the committed catalogue.
 */
export default function CartPage() {
  return (
    <>
      <PageHeader
        eyebrow="Order"
        title="Your cart"
        subtitle="Everything you have chosen so far. Change a quantity or remove a line before you order."
      />
      <CartLines lookup={buildCartLookup()} />
    </>
  );
}
