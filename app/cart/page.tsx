import type { Metadata } from "next";

import { CartLines } from "@/components/CartLines";
import { PageHeader } from "@/components/PageHeader";
import { getCategories } from "@/lib/catalogue";
import type { CartLookup } from "@/lib/checkout";

export const metadata: Metadata = {
  title: "Your cart — Aurora Supply Co.",
  description: "Review what you have chosen before ordering.",
};

/**
 * A server component. The cart itself lives in the browser, so all this page
 * does is supply the prices: it builds a sku-to-item table from the committed
 * catalogue and hands it to the client list.
 *
 * That keeps the feature at one new endpoint, keeps this route statically
 * generated, and avoids a render waterfall. The whole table goes into the RSC
 * payload, which is right at twelve items; at a few thousand it would want a
 * route handler or a lookup filtered by what is actually in the cart.
 */
export default function CartPage() {
  const lookup: CartLookup = {};

  for (const category of getCategories()) {
    for (const item of category.items) {
      lookup[item.sku] = {
        name: item.name,
        priceEur: item.priceEur,
        currency: item.currency,
        inStock: item.inStock,
        image: item.image,
      };
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Order"
        title="Your cart"
        subtitle="Everything you have chosen so far. Change a quantity or remove a line before you order."
      />
      <CartLines lookup={lookup} />
    </>
  );
}
