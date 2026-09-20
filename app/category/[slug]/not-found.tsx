import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";

export default function CategoryNotFound() {
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
        guidance="It may have been renamed. Browse the categories and start from there."
        action={
          <Link className="button" href="/">
            Browse categories
          </Link>
        }
      />
    </>
  );
}
