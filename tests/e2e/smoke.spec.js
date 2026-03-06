import { test, expect } from "@playwright/test";

test("app loads and shows main UI", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/логистика/i);
  await expect(page.locator("body")).toContainText(/логистика|cargo|client|pl/i);
});

test("key route opens without crash", async ({ page }) => {
  await page.goto("/");

  await page.goto("/clients");

  await expect(page.locator("body")).toBeVisible();
  await expect(page).toHaveTitle(/логистика/i);
});

test("user can log in with smoke account", async ({ page }) => {
  await page.goto("/");

  await page.getByPlaceholder(/логин|login/i).fill("test_smoke");
  await page.getByPlaceholder(/пароль|password/i).fill("Smoke123!");
  await page.getByRole("button", { name: /войти|login|sign in/i }).click();

  await expect(page.locator("body")).not.toContainText(/неверный логин или пароль/i);
  await expect(page.locator("body")).toContainText(/Smoke Test User|Мои грузы|Мои клиенты/i);
});