import { PageHeader } from "@/components/PageHeader";

export default function HomeLoading() {
  return (
    <>
      <PageHeader
        eyebrow="Categories"
        title="Loading categories"
        subtitle="Reading the catalogue. The categories appear here in a moment."
      />
      <ul className="grid" aria-busy="true" aria-label="Loading categories">
        {[0, 1, 2].map((key) => (
          <li key={key} className="skeleton skeleton--card-compact" />
        ))}
      </ul>
    </>
  );
}
