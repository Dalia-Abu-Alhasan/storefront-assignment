import { PageHeader } from "@/components/PageHeader";

export default function CheckoutLoading() {
  return (
    <>
      <PageHeader
        eyebrow="Order"
        title="Checkout"
        subtitle="Reading the catalogue. Your order summary and the delivery form appear here in a moment."
      />
      <ul className="grid" aria-busy="true" aria-label="Loading checkout">
        {[0, 1, 2].map((key) => (
          <li key={key} className="skeleton skeleton--card-compact" />
        ))}
      </ul>
    </>
  );
}
