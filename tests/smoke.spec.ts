import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

const CATEGORY_PATH = "/category/desk-tools";
const ITEM_PATH = "/item/DT-0001";
const OUT_OF_STOCK_PATH = "/item/DT-0003";

/** Collects console errors so a test can assert the page produced none. */
function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message: ConsoleMessage) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("the list page renders its header and every item card", async ({ page }) => {
  const errors = watchConsole(page);

  await page.goto(CATEGORY_PATH);

  await expect(page.locator(".page-header__eyebrow")).toHaveText("Category");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Desk Tools");
  await expect(page.locator(".page-header__subtitle")).not.toBeEmpty();

  await expect(page.locator(".card")).toHaveCount(4);
  await expect(page.locator(".card__price").first()).toHaveText(/^\d+\.\d{2} EUR$/);

  expect(errors).toEqual([]);
});

test("the detail page renders its header, a house-formatted price and date", async ({ page }) => {
  const errors = watchConsole(page);

  await page.goto(ITEM_PATH);

  await expect(page.locator(".page-header__eyebrow")).toHaveText("Desk Tools");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Machined Aluminium Ruler");

  await expect(page.locator(".detail__price")).toHaveText("24.50 EUR");
  await expect(page.locator(".detail__meta dd").nth(1)).toHaveText(/^\d{2} [A-Z][a-z]{2} \d{4}$/);

  expect(errors).toEqual([]);
});

test("the root lists every category and no longer redirects", async ({ page }) => {
  const errors = watchConsole(page);

  await page.goto("/");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".page-header__eyebrow")).toHaveText("Categories");
  await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
  await expect(page.locator(".page-header__subtitle")).not.toBeEmpty();

  await expect(page.locator(".card")).toHaveCount(3);
  await expect(page.locator(".card__name")).toHaveText(["Desk Tools", "Board games", "Lighting"]);
  await expect(page.locator(".card__count")).toHaveText(["4 items", "4 items", "4 items"]);

  expect(errors).toEqual([]);
});

test("activating a category card on the index navigates to that category", async ({ page }) => {
  await page.goto("/");
  await page.locator(".card__link").first().click();
  await expect(page).toHaveURL(new RegExp(`${CATEGORY_PATH}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Desk Tools");
});

test("an unknown item shows the not-found state, not a crash", async ({ page }) => {
  await page.goto("/item/NOPE-9999");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("No such item");
});

test("the rates route answers with the standard envelope shape", async ({ request }) => {
  const response = await request.get("/api/rates?to=USD");
  const body = await response.json();

  if (response.ok()) {
    expect(body).toMatchObject({ base: "EUR", target: "USD" });
    expect(typeof body.rate).toBe("number");
  } else {
    expect(body.error).toMatchObject({ code: expect.any(String), message: expect.any(String) });
  }
});

test("an unknown category shows the not-found state and recovers to the index", async ({ page }) => {
  await page.goto("/category/does-not-exist");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("No such category");
  await page.getByRole("link", { name: "Browse categories" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("an unrouted address shows the root not-found state and recovers to the index", async ({ page }) => {
  await page.goto("/nothing-here");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "There is nothing at this address",
  );
  await page.getByRole("link", { name: "Browse categories" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("adding an item from its detail page moves the masthead cart count", async ({ page }) => {
  const errors = watchConsole(page);

  await page.goto(ITEM_PATH);
  await expect(page.locator(".masthead__cart-count")).toHaveText("0");

  await page.getByRole("button", { name: "Add to cart" }).click();

  await expect(page).toHaveURL(new RegExp(`${ITEM_PATH}$`));
  await expect(page.locator(".masthead__cart-count")).toHaveText("1");

  await page.reload();
  await expect(page.locator(".masthead__cart-count")).toHaveText("1");

  // The masthead carries the count on every page, not only where it was added.
  await page.goto("/");
  await expect(page.locator(".masthead__cart-count")).toHaveText("1");
  await page.goto(CATEGORY_PATH);
  await expect(page.locator(".masthead__cart-count")).toHaveText("1");

  expect(errors).toEqual([]);
});

test("adding the same item twice raises the quantity rather than adding a line", async ({ page }) => {
  await page.goto(ITEM_PATH);

  const add = page.getByRole("button", { name: "Add to cart" });
  await add.click();
  await add.click();

  await expect(page.locator(".masthead__cart-count")).toHaveText("2");

  const stored = await page.evaluate(() => window.localStorage.getItem("aurora.cart"));
  expect(JSON.parse(stored ?? "null")).toEqual({
    version: 1,
    items: [{ sku: "DT-0001", quantity: 2 }],
  });
});

test("an out-of-stock item cannot be added to the cart", async ({ page }) => {
  const errors = watchConsole(page);

  await page.goto(OUT_OF_STOCK_PATH);

  await expect(page.getByRole("button", { name: "Add to cart" })).toBeDisabled();
  await expect(page.locator(".add-to-cart__note")).toHaveText(/out of stock/i);
  await expect(page.locator(".masthead__cart-count")).toHaveText("0");

  expect(errors).toEqual([]);
});
