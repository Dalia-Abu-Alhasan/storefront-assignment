import { PageHeader } from "@/components/PageHeader";

export default function CategoryLoading() {
  return (
    <>
      <PageHeader
        eyebrow="Category"
        title="Loading category"
        subtitle="Reading the catalogue. The items appear here in a moment."
      />
      <ul className="grid" aria-busy="true" aria-label="Loading items">
        {[0, 1, 2, 3].map((key) => (
          <li key={key} className="skeleton skeleton--card" />
        ))}
      </ul>
    </>
  );
}
