import { test, expect } from "@playwright/test";

test("deep QA: login and create 10 clients", async ({ page }) => {
  await page.goto("/");

  await page.getByPlaceholder(/логин|login/i).fill("test_smoke");
  await page.getByPlaceholder(/пароль|password/i).fill("Smoke123!");
  await page.getByRole("button", { name: /войти|login|sign in/i }).click();

  await expect(page.locator("body")).toContainText(/Smoke Test User|Мои грузы|Мои клиенты/i);

  await page.getByText(/мои клиенты/i).first().click();
  await expect(page.locator("body")).toContainText(/список клиентов|всего:/i);

  for (let i = 1; i <= 10; i++) {
    const clientName = `QA Client ${i}`;

    page.once("dialog", async (dialog) => {
      await dialog.accept(clientName);
    });

    await page.getByRole("button", { name: /\+\s*добавить клиента|добавить клиента/i }).click();

    await expect(page.locator("body")).toContainText(clientName);
  }
});
