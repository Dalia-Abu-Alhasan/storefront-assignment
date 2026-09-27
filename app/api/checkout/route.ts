import { NextResponse } from "next/server";

import { getItemBySku, type Item } from "@/lib/catalogue";
import {
  MAX_LINES,
  MAX_PER_LINE,
  SHIPPING_FIELDS,
  type OrderLine,
  type OrderResponse,
} from "@/lib/checkout";
import type { ErrorCode, ErrorEnvelope } from "@/lib/errors";

/**
 * Places an order.
 *
 * This handler makes no outbound call, reads no environment variable and sets
 * no `AbortSignal` — house rule 5's five-second timeout governs outbound calls,
 * and there is nothing here to wrap. All it does is re-read the committed
 * catalogue, confirm every line is still sold and still in stock, and recompute
 * the total from the catalogue's own prices. Nothing the client says about
 * price is read, and nothing is persisted, because there is nowhere to persist
 * it: the catalogue is a committed file and this runs as a stateless function.
 *
 * It logs nothing from the request body, on success or on failure. The body
 * carries a name, an address and a telephone number.
 */

/** Longer than any catalogue sku, and short enough to bound a response body. */
const MAX_SKU_LENGTH = 32;

function errorResponse(code: ErrorCode, message: string, status: number) {
  const body: ErrorEnvelope = { error: { code, message } };
  return NextResponse.json(body, { status });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** `AUR-20260922-9F3C`. A label on a response, not a key — nothing stores it. */
function mintReference(placedOn: string): string {
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 4).toUpperCase();
  return `AUR-${placedOn.replaceAll("-", "")}-${suffix}`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("BAD_REQUEST", "The order could not be read. Try submitting again.", 400);
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse("BAD_REQUEST", "The order could not be read. Try submitting again.", 400);
  }

  const { items, shipping } = body as { items?: unknown; shipping?: unknown };

  // 1 — shape.
  if (!Array.isArray(items) || typeof shipping !== "object" || shipping === null) {
    return errorResponse("BAD_REQUEST", "The order could not be read. Try submitting again.", 400);
  }

  // 2 — line count. An empty cart is a situation, not a fault; the client
  // renders it as the empty state rather than showing this message.
  if (items.length === 0) {
    return errorResponse("BAD_REQUEST", "There is nothing in your cart to order.", 400);
  }
  if (items.length > MAX_LINES) {
    return errorResponse(
      "BAD_REQUEST",
      `Your cart holds too many different items to order at once. The most is ${MAX_LINES}.`,
      400,
    );
  }

  // Validated lines carry the catalogue item they resolved to, so the pricing
  // pass below needs no second lookup and no non-null assertion.
  const lines: { item: Item; quantity: number }[] = [];
  const seen = new Set<string>();

  for (const entry of items) {
    if (typeof entry !== "object" || entry === null) {
      return errorResponse("BAD_REQUEST", "The cart was malformed. Reload the cart page and try again.", 400);
    }

    const { sku, quantity } = entry as { sku?: unknown; quantity?: unknown };
    // The length bound keeps a crafted request from echoing an arbitrarily long
    // string back through the ITEM_UNAVAILABLE message. No catalogue sku is
    // anywhere near it.
    if (typeof sku !== "string" || sku.length === 0 || sku.length > MAX_SKU_LENGTH) {
      return errorResponse("BAD_REQUEST", "The cart was malformed. Reload the cart page and try again.", 400);
    }

    // 3 — no duplicate sku.
    if (seen.has(sku)) {
      return errorResponse(
        "BAD_REQUEST",
        "The cart was malformed — an item appears twice. Reload the cart page and try again.",
        400,
      );
    }
    seen.add(sku);

    // 4 and 5 — the sku resolves, and the item is in stock. Both send the
    // visitor back to the cart, which is the only place either can be fixed.
    const found = getItemBySku(sku);
    if (!found) {
      return errorResponse("ITEM_UNAVAILABLE", `${sku} is no longer sold. Remove it from your cart to order.`, 409);
    }
    if (!found.item.inStock) {
      return errorResponse(
        "ITEM_UNAVAILABLE",
        `${found.item.name} is out of stock. Remove it from your cart to order.`,
        409,
      );
    }

    // 6 — a whole number within the permitted range.
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_PER_LINE
    ) {
      return errorResponse(
        "BAD_REQUEST",
        `The quantity for ${found.item.name} must be a whole number between 1 and ${MAX_PER_LINE}.`,
        400,
      );
    }

    lines.push({ item: found.item, quantity });
  }

  // 7 — every delivery field is non-blank after trimming. The form checks the
  // same five before submitting, so reaching this means the two rule sets have
  // drifted; the server wins.
  for (const { key, label } of SHIPPING_FIELDS) {
    const value = (shipping as Record<string, unknown>)[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      return errorResponse("BAD_REQUEST", `${label} is required.`, 400);
    }
  }

  /**
   * Integer cents, ignoring anything price-shaped in the request. The cart page
   * previews the total by the identical rule, so the preview and this
   * authoritative figure agree to the penny.
   */
  let totalCents = 0;
  const priced: OrderLine[] = lines.map(({ item, quantity }) => {
    const lineCents = Math.round(item.priceEur * 100) * quantity;
    totalCents += lineCents;

    return {
      sku: item.sku,
      name: item.name,
      quantity,
      unitPriceEur: item.priceEur,
      lineTotalEur: lineCents / 100,
    };
  });

  const placedOn = today();

  // No delivery detail reaches this body, so none can reach browser storage or
  // the confirmation page.
  const order: OrderResponse = {
    reference: mintReference(placedOn),
    placedOn,
    lines: priced,
    totalEur: totalCents / 100,
    currency: "EUR",
  };

  return NextResponse.json(order, { status: 201 });
}
