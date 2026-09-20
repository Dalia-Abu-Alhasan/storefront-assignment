import { redirect } from "next/navigation";

import { getCategories } from "@/lib/catalogue";

/**
 * Not a page. The vertical slice ships one category, so the root sends the
 * reader straight to it. A categories index replaces this once there is more
 * than one category to index.
 */
export default function RootRedirect() {
  const [first] = getCategories();
  redirect(`/category/${first.slug}`);
}
