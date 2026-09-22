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

const CART_PATH = "/cart";

/** Puts a cart in browser storage before the page under test loads. */
function seedCart(page: Page, items: { sku: string; quantity: number }[]) {
  return page.addInitScript(
    (payload) => window.localStorage.setItem("aurora.cart", payload),
    JSON.stringify({ version: 1, items }),
  );
}

test("the cart page lists what was added, with a subtotal", async ({ page }) => {
  const errors = watchConsole(page);

  await seedCart(page, [{ sku: "DT-0001", quantity: 2 }]);
  await page.goto(CART_PATH);

  await expect(page.locator(".page-header__eyebrow")).toHaveText("Order");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your cart");

  await expect(page.locator(".cart__line")).toHaveCount(1);
  await expect(page.locator(".cart__name")).toHaveText("Machined Aluminium Ruler");
  await expect(page.locator(".cart__line-total")).toHaveText("49.00 EUR");
  await expect(page.locator(".cart__subtotal-amount")).toHaveText("49.00 EUR");
  await expect(page.locator(".cart__subtotal-amount")).toHaveText(/^\d+\.\d{2} EUR$/);

  expect(errors).toEqual([]);
});

test("changing a quantity updates the line total and the subtotal", async ({ page }) => {
  await seedCart(page, [{ sku: "DT-0001", quantity: 2 }]);
  await page.goto(CART_PATH);

  await page.getByRole("button", { name: "One more Machined Aluminium Ruler" }).click();
  await expect(page.locator(".cart__quantity-value")).toHaveText("3");
  await expect(page.locator(".cart__line-total")).toHaveText("73.50 EUR");
  await expect(page.locator(".cart__subtotal-amount")).toHaveText("73.50 EUR");
  await expect(page.locator(".masthead__cart-count")).toHaveText("3");

  const fewer = page.getByRole("button", { name: "One fewer Machined Aluminium Ruler" });
  await fewer.click();
  await fewer.click();
  await expect(page.locator(".cart__quantity-value")).toHaveText("1");
  await expect(fewer).toBeDisabled();
  await expect(page.locator(".cart__subtotal-amount")).toHaveText("24.50 EUR");
});

test("removing the last line shows the cart empty state", async ({ page }) => {
  await seedCart(page, [{ sku: "DT-0001", quantity: 1 }]);
  await page.goto(CART_PATH);

  await page.getByRole("button", { name: "Remove Machined Aluminium Ruler" }).click();

  await expect(page.locator(".state--empty")).toBeVisible();
  await expect(page.locator(".state__title")).toHaveText("Your cart is empty");
  await expect(page.locator(".masthead__cart-count")).toHaveText("0");
});

test("the cart empty state recovers to the categories index", async ({ page }) => {
  await page.goto(CART_PATH);

  await expect(page.locator(".state__title")).toHaveText("Your cart is empty");
  await page.getByRole("link", { name: "Browse categories" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
});

test("a cart line whose item is no longer sold is marked unavailable and blocks checkout", async ({
  page,
}) => {
  await seedCart(page, [
    { sku: "DT-0001", quantity: 1 },
    { sku: "DT-0003", quantity: 1 },
    { sku: "XX-9999", quantity: 1 },
  ]);
  await page.goto(CART_PATH);

  await expect(page.locator(".cart__line")).toHaveCount(3);
  // Both blocked branches: gone from the catalogue, and present but out of stock.
  await expect(page.locator(".cart__gone")).toHaveText([
    /out of stock/,
    /no longer in the catalogue/,
  ]);

  // Blocked lines are excluded from the subtotal, not silently priced at zero.
  await expect(page.locator(".cart__subtotal-amount")).toHaveText("24.50 EUR");
  await expect(page.getByRole("button", { name: "Proceed to checkout" })).toBeDisabled();

  await page.getByRole("button", { name: "Remove unavailable" }).click();

  await expect(page.locator(".cart__line")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Proceed to checkout" })).toBeVisible();
});

test("a cart says so when the browser is blocking storage, and still works", async ({ page }) => {
  // Every storage call throws, as it does in a locked-down or private window.
  await page.addInitScript(() => {
    const blocked = () => {
      throw new Error("storage is blocked");
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: { getItem: blocked, setItem: blocked, removeItem: blocked },
    });
  });

  await page.goto(ITEM_PATH);
  await page.getByRole("button", { name: "Add to cart" }).click();

  // The add still applies in memory, and the item page says it will not persist.
  await expect(page.locator(".masthead__cart-count")).toHaveText("1");
  await expect(page.locator(".add-to-cart__note")).toHaveText(/blocking storage/);

  // A soft navigation keeps the store alive, so the line reaches the cart page.
  await page.getByRole("link", { name: /^Cart/ }).click();
  await expect(page).toHaveURL(new RegExp(`${CART_PATH}$`));

  await expect(page.locator(".cart__line")).toHaveCount(1);
  await expect(page.locator(".state--error .state__title")).toHaveText(
    "This cart will not be saved",
  );
  await expect(page.locator(".cart__subtotal-amount")).toHaveText("24.50 EUR");
});
