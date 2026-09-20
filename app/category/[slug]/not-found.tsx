import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";
import { getCategories } from "@/lib/catalogue";

export default function CategoryNotFound() {
  const [first] = getCategories();

  return (
    <>
      <PageHeader
        eyebrow="Category"
        title="No such category"
        subtitle="The address you followed does not match anything in the catalogue."
      />
      <StateMessage
        tone="empty"
        title="That category does not exist"
        guidance="It may have been renamed. Start from a category that does exist and browse from there."
        action={
          <Link className="button" href={`/category/${first.slug}`}>
            Go to {first.name}
          </Link>
        }
      />
    </>
  );
}
