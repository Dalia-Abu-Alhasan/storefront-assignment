import type { Metadata } from "next";

import { OrderConfirmation } from "@/components/OrderConfirmation";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Your order — Aurora Supply Co.",
  description: "What you ordered, and what it came to.",
};

/**
 * Its own route segment rather than a fourth state of `/checkout`: the back
 * button then behaves, and the address bar does not lie about where you are.
 *
 * A server component with nothing to fetch — the order lives in the browser,
 * so the client leaf reads it. The header is written for all four states,
 * because this file cannot know which one the leaf will render.
 */
export default function ConfirmationPage() {
  return (
    <>
      <PageHeader
        eyebrow="Order"
        title="Your order"
        subtitle="This is a demonstration shop. Nothing was charged, nothing is kept on our servers, and no order will be dispatched."
      />
      <OrderConfirmation />
    </>
  );
}
