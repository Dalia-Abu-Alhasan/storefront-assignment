import { CategoryCard } from "@/components/CategoryCard";
import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";
import { getCategories } from "@/lib/catalogue";

export default function HomePage() {
  const categories = getCategories();
  const count = categories.length;

  return (
    <>
      <PageHeader
        eyebrow="Categories"
        title="Aurora Supply Co."
        subtitle={`${count} ${count === 1 ? "category" : "categories"} to browse.`}
      />

      {count === 0 ? (
        <StateMessage
          tone="empty"
          title="Nothing in the catalogue yet"
          guidance="Categories are added here as they go live. Check back soon."
        />
      ) : (
        <ul className="grid">
          {categories.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
        </ul>
      )}
    </>
  );
}
