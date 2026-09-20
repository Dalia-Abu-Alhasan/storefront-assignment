import catalogueJson from "@/data/catalogue.json";

export type ItemImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type Item = {
  sku: string;
  name: string;
  blurb: string;
  description: string;
  priceEur: number;
  currency: "EUR";
  inStock: boolean;
  /** ISO `YYYY-MM-DD`. Render only through `formatDate`. */
  addedOn: string;
  image: ItemImage;
};

export type Category = {
  slug: string;
  name: string;
  blurb: string;
  items: Item[];
};

export type Catalogue = {
  categories: Category[];
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function fail(where: string, problem: string): never {
  throw new Error(`data/catalogue.json is invalid — ${where}: ${problem}`);
}

function assertImage(image: unknown, where: string): asserts image is ItemImage {
  if (typeof image !== "object" || image === null) fail(where, "image must be an object");
  const { src, alt, width, height } = image as Record<string, unknown>;
  if (typeof src !== "string" || src.length === 0) fail(where, "image.src must be a non-empty string");
  if (typeof alt !== "string") fail(where, "image.alt must be a string (empty only if decorative)");
  if (typeof width !== "number" || width <= 0) fail(where, "image.width must be a positive number");
  if (typeof height !== "number" || height <= 0) fail(where, "image.height must be a positive number");
}

function assertItem(item: unknown, where: string, seenSkus: Set<string>): asserts item is Item {
  if (typeof item !== "object" || item === null) fail(where, "item must be an object");
  const value = item as Record<string, unknown>;

  if (typeof value.sku !== "string" || value.sku.length === 0) fail(where, "sku must be a non-empty string");
  if (seenSkus.has(value.sku)) fail(where, `sku "${value.sku}" is duplicated — skus must be unique`);
  seenSkus.add(value.sku);

  for (const field of ["name", "blurb", "description"] as const) {
    if (typeof value[field] !== "string" || (value[field] as string).length === 0) {
      fail(`${where} (${value.sku})`, `${field} must be a non-empty string`);
    }
  }

  if (typeof value.priceEur !== "number" || !Number.isFinite(value.priceEur) || value.priceEur < 0) {
    fail(`${where} (${value.sku})`, "priceEur must be a non-negative number");
  }
  if (value.currency !== "EUR") fail(`${where} (${value.sku})`, 'currency must be the ISO code "EUR"');
  if (typeof value.inStock !== "boolean") fail(`${where} (${value.sku})`, "inStock must be a boolean");
  if (typeof value.addedOn !== "string" || !ISO_DATE.test(value.addedOn)) {
    fail(`${where} (${value.sku})`, "addedOn must be an ISO date, YYYY-MM-DD");
  }

  assertImage(value.image, `${where} (${value.sku})`);
}

export function assertCatalogue(data: unknown): asserts data is Catalogue {
  if (typeof data !== "object" || data === null) fail("root", "expected an object");
  const { categories } = data as Record<string, unknown>;
  if (!Array.isArray(categories) || categories.length === 0) {
    fail("root", "categories must be a non-empty array");
  }

  const seenSlugs = new Set<string>();
  const seenSkus = new Set<string>();

  categories.forEach((category, index) => {
    const where = `categories[${index}]`;
    if (typeof category !== "object" || category === null) fail(where, "category must be an object");
    const value = category as Record<string, unknown>;

    if (typeof value.slug !== "string" || !SLUG.test(value.slug)) {
      fail(where, "slug must be kebab-case, e.g. desk-tools");
    }
    if (seenSlugs.has(value.slug)) fail(where, `slug "${value.slug}" is duplicated — slugs must be unique`);
    seenSlugs.add(value.slug);

    for (const field of ["name", "blurb"] as const) {
      if (typeof value[field] !== "string" || (value[field] as string).length === 0) {
        fail(`${where} (${value.slug})`, `${field} must be a non-empty string`);
      }
    }

    if (!Array.isArray(value.items)) fail(`${where} (${value.slug})`, "items must be an array");
    value.items.forEach((item, itemIndex) => {
      assertItem(item, `${where}.items[${itemIndex}]`, seenSkus);
    });
  });
}

assertCatalogue(catalogueJson);
const catalogue: Catalogue = catalogueJson;

export function getCategories(): Category[] {
  return catalogue.categories;
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return catalogue.categories.find((category) => category.slug === slug);
}

export function getItemBySku(sku: string): { item: Item; category: Category } | undefined {
  for (const category of catalogue.categories) {
    const item = category.items.find((candidate) => candidate.sku === sku);
    if (item) return { item, category };
  }
  return undefined;
}
