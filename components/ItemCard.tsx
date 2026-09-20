import Image from "next/image";
import Link from "next/link";

import type { Item } from "@/lib/catalogue";
import { formatMoney } from "@/lib/format";

export function ItemCard({ item }: { item: Item }) {
  return (
    <li className="card">
      <Link href={`/item/${item.sku}`} className="card__link">
        <Image
          className="card__image"
          src={item.image.src}
          alt={item.image.alt}
          width={item.image.width}
          height={item.image.height}
        />
        <div className="card__body">
          <h2 className="card__name">{item.name}</h2>
          <p className="card__blurb">{item.blurb}</p>
          <p className="card__price">{formatMoney(item.priceEur, item.currency)}</p>
          <p className={`badge ${item.inStock ? "badge--in" : "badge--out"}`}>
            {item.inStock ? "In stock" : "Out of stock"}
          </p>
        </div>
      </Link>
    </li>
  );
}
