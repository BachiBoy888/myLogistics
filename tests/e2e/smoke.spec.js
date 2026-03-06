import { test, expect } from "@playwright/test";

test("app loads", async ({ page }) => {
  await page.goto("http://localhost:5173");

  await expect(page).toHaveTitle(/Моя логистика/i);
});
