import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ItemCard } from "@/components/ItemCard";
import { PageHeader } from "@/components/PageHeader";
import { StateMessage } from "@/components/StateMessage";
import { getCategories, getCategoryBySlug } from "@/lib/catalogue";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getCategories().map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return { title: "Category not found — Aurora Supply Co." };
  return { title: `${category.name} — Aurora Supply Co.`, description: category.blurb };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) notFound();

  const count = category.items.length;

  return (
    <>
      <PageHeader
        eyebrow="Category"
        title={category.name}
        subtitle={`${category.blurb} ${count} ${count === 1 ? "item" : "items"} in this category.`}
      />

      {count === 0 ? (
        <StateMessage
          tone="empty"
          title="Nothing in this category yet"
          guidance="Stock is added here as it arrives. Try another category, or check back next week."
        />
      ) : (
        <ul className="grid">
          {category.items.map((item) => (
            <ItemCard key={item.sku} item={item} />
          ))}
        </ul>
      )}
    </>
  );
}
