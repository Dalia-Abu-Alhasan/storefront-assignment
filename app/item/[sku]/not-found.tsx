import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";
import { getCategories } from "@/lib/catalogue";

export default function ItemNotFound() {
  const [first] = getCategories();

  return (
    <>
      <PageHeader
        eyebrow="Item"
        title="No such item"
        subtitle="The address you followed does not match anything in the catalogue."
      />
      <StateMessage
        tone="empty"
        title="That item does not exist"
        guidance="It may have been withdrawn, or the item code may be mistyped. Browse the category to find it."
        action={
          <Link className="button" href={`/category/${first.slug}`}>
            Browse {first.name}
          </Link>
        }
      />
    </>
  );
}
