import { getCategories } from "@/lib/catalogue";
import type { CartLookup } from "@/lib/checkout";

/**
 * Builds the sku-to-item table the cart and checkout page shells hand to their
 * client leaves.
 *
 * Both are server components over the committed catalogue, so they can supply
 * the prices alongside their HTML rather than the client asking for them. That
 * keeps the feature at one new endpoint, keeps both routes statically
 * generated, and avoids a render waterfall.
 *
 * A server module: it reads the catalogue at value level, so importing it from
 * a client component would pull `lib/catalogue.ts` — and its import-time
 * `assertCatalogue()` — into the browser bundle.
 *
 * The whole table goes into the RSC payload, which is right at twelve items. At
 * a few thousand it would want a route handler, or a lookup filtered by what is
 * actually in the cart — but the cart is client-held, so the server does not
 * know what to filter by without being told.
 */
export function buildCartLookup(): CartLookup {
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

  return lookup;
}
