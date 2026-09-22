import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/AddToCart";
import { ConvertedPrice } from "@/components/ConvertedPrice";
import { PageHeader } from "@/components/PageHeader";
import { getCategories, getItemBySku } from "@/lib/catalogue";
import { formatDate, formatMoney } from "@/lib/format";

const SECONDARY_CURRENCY = "USD";

type PageProps = { params: Promise<{ sku: string }> };

export function generateStaticParams() {
  return getCategories().flatMap((category) => category.items.map((item) => ({ sku: item.sku })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sku } = await params;
  const found = getItemBySku(sku);
  if (!found) return { title: "Item not found — Aurora Supply Co." };
  return { title: `${found.item.name} — Aurora Supply Co.`, description: found.item.blurb };
}

export default async function ItemPage({ params }: PageProps) {
  const { sku } = await params;
  const found = getItemBySku(sku);

  if (!found) notFound();

  const { item, category } = found;

  return (
    <>
      <PageHeader eyebrow={category.name} title={item.name} subtitle={item.blurb} />

      <div className="detail">
        <Image
          className="detail__image"
          src={item.image.src}
          alt={item.image.alt}
          width={item.image.width}
          height={item.image.height}
          priority
        />

        <div>
          <p className="detail__price">{formatMoney(item.priceEur, item.currency)}</p>
          <ConvertedPrice priceEur={item.priceEur} target={SECONDARY_CURRENCY} />

          <p className={`badge ${item.inStock ? "badge--in" : "badge--out"}`}>
            {item.inStock ? "In stock" : "Out of stock"}
          </p>

          <AddToCart sku={item.sku} inStock={item.inStock} />

          <p className="detail__description">{item.description}</p>

          <dl className="detail__meta">
            <dt>Item code</dt>
            <dd>{item.sku}</dd>
            <dt>Added</dt>
            <dd>{formatDate(item.addedOn)}</dd>
            <dt>Category</dt>
            <dd>
              <Link href={`/category/${category.slug}`}>{category.name}</Link>
            </dd>
          </dl>
        </div>
      </div>
    </>
  );
}
