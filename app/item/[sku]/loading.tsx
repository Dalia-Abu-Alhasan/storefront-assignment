import { PageHeader } from "@/components/PageHeader";

export default function ItemLoading() {
  return (
    <>
      <PageHeader
        eyebrow="Item"
        title="Loading item"
        subtitle="Reading the catalogue. The details appear here in a moment."
      />
      <div className="detail" aria-busy="true">
        <div className="skeleton" style={{ height: "22rem" }} />
        <div>
          <div className="skeleton skeleton--line" style={{ width: "10rem", height: "2rem" }} />
          <div className="skeleton skeleton--line" style={{ width: "100%" }} />
          <div className="skeleton skeleton--line" style={{ width: "90%" }} />
          <div className="skeleton skeleton--line" style={{ width: "70%" }} />
        </div>
      </div>
    </>
  );
}
