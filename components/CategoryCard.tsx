import Link from "next/link";

import type { Category } from "@/lib/catalogue";

export function CategoryCard({ category }: { category: Category }) {
  const count = category.items.length;

  return (
    <li className="card">
      <Link href={`/category/${category.slug}`} className="card__link">
        <div className="card__body">
          <h2 className="card__name">{category.name}</h2>
          <p className="card__blurb">{category.blurb}</p>
          {count === 0 ? (
            <p className="badge badge--empty">Nothing in stock yet</p>
          ) : (
            <p className="card__count">
              {count} {count === 1 ? "item" : "items"}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
