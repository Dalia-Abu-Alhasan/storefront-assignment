import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";

export default function RootNotFound() {
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
        guidance="The link may be out of date, or the address mistyped. Browse the categories and start from there."
        action={
          <Link className="button" href="/">
            Browse categories
          </Link>
        }
      />
    </>
  );
}
