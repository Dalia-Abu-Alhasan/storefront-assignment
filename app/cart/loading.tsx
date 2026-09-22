import { PageHeader } from "@/components/PageHeader";

export default function CartLoading() {
  return (
    <>
      <PageHeader
        eyebrow="Order"
        title="Your cart"
        subtitle="Reading the catalogue. Your lines and their prices appear here in a moment."
      />
      <ul className="grid" aria-busy="true" aria-label="Loading your cart">
        {[0, 1, 2].map((key) => (
          <li key={key} className="skeleton skeleton--card-compact" />
        ))}
      </ul>
    </>
  );
}
