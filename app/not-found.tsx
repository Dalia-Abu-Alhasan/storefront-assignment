import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";
import { getCategories } from "@/lib/catalogue";

export default function RootNotFound() {
  const [first] = getCategories();

  return (
    <>
      <PageHeader
        eyebrow="Not found"
        title="There is nothing at this address"
        subtitle="The page you asked for does not exist in this catalogue."
      />
      <StateMessage
        tone="empty"
        title="No such page"
        guidance="The link may be out of date, or the address mistyped. Start from a category and browse from there."
        action={
          <Link className="button" href={`/category/${first.slug}`}>
            Go to {first.name}
          </Link>
        }
      />
    </>
  );
}
