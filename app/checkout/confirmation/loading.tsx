import { PageHeader } from "@/components/PageHeader";

export default function ConfirmationLoading() {
  return (
    <>
      <PageHeader
        eyebrow="Order"
        title="Your order"
        subtitle="This is a demonstration shop. Nothing was charged, nothing is kept on our servers, and no order will be dispatched."
      />
      <ul className="grid" aria-busy="true" aria-label="Loading your order">
        {[0, 1, 2].map((key) => (
          <li key={key} className="skeleton skeleton--card-compact" />
        ))}
      </ul>
    </>
  );
}
