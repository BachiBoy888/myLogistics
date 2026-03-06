import { test, expect } from "@playwright/test";

test("app loads and shows main UI", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/логистика/i);

  await expect(page.locator("body")).toContainText(/логистика|cargo|client|pl/i);
});
