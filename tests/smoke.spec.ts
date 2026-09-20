import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

const CATEGORY_PATH = "/category/desk-tools";
const ITEM_PATH = "/item/DT-0001";

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
