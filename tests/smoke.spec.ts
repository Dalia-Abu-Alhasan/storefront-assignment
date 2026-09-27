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

const CHECKOUT_PATH = "/checkout";

/** A complete set of delivery details, filled in field order. */
async function fillDelivery(page: Page, overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    "Full name": "Ada Lovelace",
    Address: "12 Tally Lane",
    City: "Bath",
    "Postal code": "BA1 1AA",
    Phone: "01225 000000",
    ...overrides,
  };

  for (const [label, value] of Object.entries(values)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
}

test("checkout with an empty cart shows its empty state, not a form", async ({ page }) => {
  const errors = watchConsole(page);

  await page.goto(CHECKOUT_PATH);

  await expect(page.locator(".page-header__eyebrow")).toHaveText("Order");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Checkout");
  await expect(page.locator(".page-header__subtitle")).not.toBeEmpty();

  await expect(page.locator(".state--empty .state__title")).toHaveText(
    "There is nothing to check out",
  );
  await expect(page.locator(".state__guidance")).not.toBeEmpty();
  await expect(page.locator("form.form")).toHaveCount(0);

  await page.getByRole("link", { name: "Browse categories" }).click();
  await expect(page).toHaveURL(/\/$/);

  expect(errors).toEqual([]);
});

test("checkout summarises the cart and says it is a demonstration shop", async ({ page }) => {
  const errors = watchConsole(page);

  await seedCart(page, [
    { sku: "DT-0001", quantity: 2 },
    { sku: "DT-0002", quantity: 1 },
  ]);
  await page.goto(CHECKOUT_PATH);

  await expect(page.locator(".summary__line")).toHaveCount(2);
  await expect(page.locator(".summary__total-amount")).toHaveText("67.00 EUR");
  await expect(page.locator(".summary__total-amount")).toHaveText(/^\d+\.\d{2} EUR$/);

  // The warning sits above the fieldset, not only on the confirmation after.
  await expect(page.locator(".form__notice")).toHaveText(/demonstration shop/i);
  await expect(page.locator(".fieldset__legend")).toHaveText("Delivery details");
  await expect(page.getByLabel("Full name", { exact: true })).toBeVisible();

  expect(errors).toEqual([]);
});

test("submitting checkout with a blank required field names that field", async ({ page }) => {
  const errors = watchConsole(page);

  await seedCart(page, [{ sku: "DT-0001", quantity: 1 }]);
  await page.goto(CHECKOUT_PATH);

  // Each of the five in turn, so no field's own rule is missing.
  for (const blank of ["Full name", "Address", "City", "Postal code", "Phone"]) {
    await fillDelivery(page, { [blank]: "" });
    await page.getByRole("button", { name: "Place order" }).click();

    const field = page.getByLabel(blank, { exact: true });
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.locator(".field__error", { hasText: blank + " is required." }),
    ).toBeVisible();
    await expect(field).toBeFocused();

    // Nothing was sent, so the form is still here with what was typed intact.
    await expect(page).toHaveURL(new RegExp(CHECKOUT_PATH + "$"));
    await expect(page.getByLabel("City", { exact: true })).toHaveValue(
      blank === "City" ? "" : "Bath",
    );
  }

  expect(errors).toEqual([]);
});

test("checkout blocks an unavailable line and sends the visitor back to the cart", async ({
  page,
}) => {
  await seedCart(page, [{ sku: "XX-9999", quantity: 1 }]);
  await page.goto(CHECKOUT_PATH);

  await expect(page.locator(".state--error .state__title")).toHaveText(
    "Some lines cannot be ordered",
  );
  await expect(page.locator("form.form")).toHaveCount(0);

  await page.getByRole("link", { name: "Back to your cart" }).click();
  await expect(page).toHaveURL(new RegExp(CART_PATH + "$"));
});

/** The five delivery fields, complete and valid, for the route-level cases. */
const SHIPPING = {
  fullName: "Ada Lovelace",
  addressLine: "12 Tally Lane",
  city: "Bath",
  postalCode: "BA1 1AA",
  phone: "01225 000000",
};

test("the checkout route prices an order from the catalogue and mints a reference", async ({
  request,
}) => {
  const response = await request.post("/api/checkout", {
    data: { items: [{ sku: "DT-0001", quantity: 2 }], shipping: SHIPPING },
  });

  expect(response.status()).toBe(201);
  const body = await response.json();

  expect(body.reference).toMatch(/^AUR-\d{8}-[0-9A-F]{4}$/);
  expect(body.placedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(body.currency).toBe("EUR");
  expect(body.totalEur).toBe(49);
  expect(body.lines).toEqual([
    {
      sku: "DT-0001",
      name: "Machined Aluminium Ruler",
      quantity: 2,
      unitPriceEur: 24.5,
      lineTotalEur: 49,
    },
  ]);
});

test("the checkout route rejects an unknown item code with the house error envelope", async ({
  request,
}) => {
  const response = await request.post("/api/checkout", {
    data: { items: [{ sku: "XX-9999", quantity: 1 }], shipping: SHIPPING },
  });

  expect(response.status()).toBe(409);
  const body = await response.json();

  // The envelope carries a code and a message and nothing else.
  expect(Object.keys(body)).toEqual(["error"]);
  expect(Object.keys(body.error).sort()).toEqual(["code", "message"]);
  expect(body.error.code).toBe("ITEM_UNAVAILABLE");
  expect(body.error.message).toContain("XX-9999");

  // No file path and no stack trace reaches a visitor.
  expect(body.error.message).not.toMatch(/\.ts|\.json|node_modules|at .+:\d+/);
});

test("the checkout route rejects an out-of-stock item", async ({ request }) => {
  const response = await request.post("/api/checkout", {
    data: { items: [{ sku: "DT-0003", quantity: 1 }], shipping: SHIPPING },
  });

  expect(response.status()).toBe(409);
  const body = await response.json();
  expect(body.error.code).toBe("ITEM_UNAVAILABLE");
  expect(body.error.message).toMatch(/out of stock/i);
});

test("the checkout route rejects an invalid quantity", async ({ request }) => {
  // Zero, negative, fractional, over the cap, and not a number at all.
  for (const quantity of [0, -1, 1.5, 11, "2"]) {
    const response = await request.post("/api/checkout", {
      data: { items: [{ sku: "DT-0001", quantity }], shipping: SHIPPING },
    });

    expect(response.status(), "quantity " + String(quantity)).toBe(400);
    const body = await response.json();
    expect(Object.keys(body)).toEqual(["error"]);
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.message).toMatch(/between 1 and 10/);
  }
});

test("the checkout route rejects duplicates, no items, a blank field and an unreadable body", async ({
  request,
}) => {
  const duplicate = await request.post("/api/checkout", {
    data: {
      items: [
        { sku: "DT-0001", quantity: 1 },
        { sku: "DT-0001", quantity: 1 },
      ],
      shipping: SHIPPING,
    },
  });
  expect(duplicate.status()).toBe(400);
  expect((await duplicate.json()).error.code).toBe("BAD_REQUEST");

  const empty = await request.post("/api/checkout", {
    data: { items: [], shipping: SHIPPING },
  });
  expect(empty.status()).toBe(400);
  expect((await empty.json()).error.code).toBe("BAD_REQUEST");

  const blank = await request.post("/api/checkout", {
    data: {
      items: [{ sku: "DT-0001", quantity: 1 }],
      shipping: { ...SHIPPING, city: "   " },
    },
  });
  expect(blank.status()).toBe(400);
  const blankBody = await blank.json();
  expect(blankBody.error.code).toBe("BAD_REQUEST");
  expect(blankBody.error.message).toBe("City is required.");

  const unreadable = await request.post("/api/checkout", {
    headers: { "Content-Type": "application/json" },
    data: "not json at all",
  });
  expect(unreadable.status()).toBe(400);
  expect((await unreadable.json()).error.code).toBe("BAD_REQUEST");
});

test("the checkout route ignores a total sent by the client", async ({ request }) => {
  const response = await request.post("/api/checkout", {
    data: {
      items: [{ sku: "DT-0001", quantity: 1, unitPriceEur: 0.01, lineTotalEur: 0.01 }],
      shipping: SHIPPING,
      totalEur: 0.01,
    },
  });

  expect(response.status()).toBe(201);
  const body = await response.json();

  // The catalogue's price, not the one in the request.
  expect(body.totalEur).toBe(24.5);
  expect(body.lines[0].unitPriceEur).toBe(24.5);
  expect(body.lines[0].lineTotalEur).toBe(24.5);
});

test("the checkout route bounds the item code it will echo back", async ({ request }) => {
  const response = await request.post("/api/checkout", {
    data: { items: [{ sku: "X".repeat(4096), quantity: 1 }], shipping: SHIPPING },
  });

  // Malformed rather than unavailable: nothing that long is an item code, so
  // the response body stays bounded instead of quoting it back.
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error.code).toBe("BAD_REQUEST");
  expect(body.error.message.length).toBeLessThan(200);
});

const CONFIRMATION_PATH = "/checkout/confirmation";

test("completing checkout reaches a confirmation with a reference and a total", async ({ page }) => {
  const errors = watchConsole(page);

  await seedCart(page, [
    { sku: "DT-0001", quantity: 2 },
    { sku: "DT-0002", quantity: 1 },
  ]);
  await page.goto(CHECKOUT_PATH);

  await fillDelivery(page);
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(page).toHaveURL(new RegExp(CONFIRMATION_PATH + "$"));
  await expect(page.locator(".page-header__eyebrow")).toHaveText("Order");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your order");
  // The demonstration statement is on the confirmation too, not only the form.
  await expect(page.locator(".page-header__subtitle")).toHaveText(/demonstration shop/i);

  await expect(page.locator(".order__reference")).toHaveText(/^AUR-\d{8}-[0-9A-F]{4}$/);
  await expect(page.locator(".order__meta dd").nth(1)).toHaveText(
    /^\d{2} [A-Z][a-z]{2} \d{4}$/,
  );

  // The server's lines and the server's total, in the house money format.
  await expect(page.locator(".summary__line")).toHaveCount(2);
  await expect(page.locator(".summary__total-amount")).toHaveText("67.00 EUR");
  await expect(page.locator(".summary__total-amount")).toHaveText(/^\d+\.\d{2} EUR$/);

  // No delivery detail reaches the response, storage or this page.
  await expect(page.locator("body")).not.toContainText("Ada Lovelace");
  await expect(page.locator("body")).not.toContainText("Tally Lane");
  const order = await page.evaluate(() => window.sessionStorage.getItem("aurora.order"));
  expect(order).not.toContain("Ada Lovelace");
  expect(order).not.toContain("Tally Lane");

  expect(errors).toEqual([]);
});

test("the cart is empty after an order is placed", async ({ page }) => {
  await seedCart(page, [{ sku: "DT-0001", quantity: 2 }]);
  await page.goto(CHECKOUT_PATH);

  await fillDelivery(page);
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(new RegExp(CONFIRMATION_PATH + "$"));

  await expect(page.locator(".masthead__cart-count")).toHaveText("0");
  const stored = await page.evaluate(() => window.localStorage.getItem("aurora.cart"));
  expect(JSON.parse(stored ?? "null")).toEqual({ version: 1, items: [] });

  // And the cart page agrees, rather than only the indicator. Reached by the
  // masthead link: a `page.goto` would re-run `seedCart`'s init script and put
  // the cart back.
  await page.getByRole("link", { name: /^Cart/ }).click();
  await expect(page).toHaveURL(new RegExp(CART_PATH + "$"));
  await expect(page.locator(".state__title")).toHaveText("Your cart is empty");
});

test("reloading the confirmation shows the same order and places no second order", async ({
  page,
}) => {
  await seedCart(page, [{ sku: "DT-0001", quantity: 1 }]);
  await page.goto(CHECKOUT_PATH);

  await fillDelivery(page);
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(new RegExp(CONFIRMATION_PATH + "$"));

  const reference = await page.locator(".order__reference").textContent();
  expect(reference).toMatch(/^AUR-\d{8}-[0-9A-F]{4}$/);

  // Count order requests from here on: a reload must issue none.
  const placed: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/checkout") && request.method() === "POST") {
      placed.push(request.url());
    }
  });

  await page.reload();

  await expect(page.locator(".order__reference")).toHaveText(reference ?? "");
  await expect(page.locator(".summary__total-amount")).toHaveText("24.50 EUR");
  expect(placed).toEqual([]);
});

test("opening the confirmation directly shows its empty state", async ({ page }) => {
  const errors = watchConsole(page);

  await page.goto(CONFIRMATION_PATH);

  // Empty, not an error and not a not-found: the address is real, there is
  // simply no recent order behind it.
  await expect(page.locator(".state--empty .state__title")).toHaveText(
    "There is no recent order to show",
  );
  await expect(page.locator(".state__guidance")).not.toBeEmpty();
  await expect(page.locator(".order__reference")).toHaveCount(0);

  await page.getByRole("link", { name: "Browse categories" }).click();
  await expect(page).toHaveURL(/\/$/);

  expect(errors).toEqual([]);
});

test("an unreadable stored order shows the confirmation error state and recovers", async ({
  page,
}) => {
  await page.addInitScript(() =>
    window.sessionStorage.setItem("aurora.order", "{not json at all"),
  );
  await page.goto(CONFIRMATION_PATH);

  await expect(page.locator(".state--error .state__title")).toHaveText(
    "Your order could not be read",
  );

  // Discarded on the way through, so a reload recovers to the empty state
  // rather than stranding the visitor on an error they cannot clear.
  const stored = await page.evaluate(() => window.sessionStorage.getItem("aurora.order"));
  expect(stored).toBeNull();
});

test("a server rejection renders above the form, not below it", async ({ page }) => {
  await seedCart(page, [{ sku: "DT-0001", quantity: 1 }]);

  // The one rejection the form's own rules cannot reach: the server disagreeing
  // about stock. Forced here, because the client blocks such a line first.
  await page.route("**/api/checkout", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "ITEM_UNAVAILABLE",
          message: "Machined Aluminium Ruler is out of stock. Remove it from your cart to order.",
        },
      }),
    }),
  );

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(CHECKOUT_PATH);

  await fillDelivery(page);
  await page.getByRole("button", { name: "Place order" }).click();

  const banner = page.locator(".checkout .state--error");
  await expect(banner.locator(".state__title")).toHaveText("Your order was not placed");

  // The grid once auto-placed this into its second row — below the whole form,
  // where nobody looks after pressing Place order.
  const bannerBox = await banner.boundingBox();
  const formBox = await page.locator("form.form").boundingBox();
  expect(bannerBox && formBox && bannerBox.y < formBox.y).toBe(true);

  // And what was typed survives, so the visitor is not made to retype it.
  await expect(page.getByLabel("City", { exact: true })).toHaveValue("Bath");
  await expect(page).toHaveURL(new RegExp(CHECKOUT_PATH + "$"));

  // The fix lives on the cart, so that is where the control goes.
  await page.getByRole("link", { name: "Back to your cart" }).click();
  await expect(page).toHaveURL(new RegExp(CART_PATH + "$"));
});
