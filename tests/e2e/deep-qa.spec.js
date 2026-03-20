import { test, expect } from "@playwright/test";

test("deep QA: login and create 10 clients", async ({ page }) => {
  await page.goto("/");

  await page.getByPlaceholder(/логин|login/i).fill("test_smoke");
  await page.getByPlaceholder(/пароль|password/i).fill("Smoke123!");
  await page.getByRole("button", { name: /войти|login|sign in/i }).click();

  await expect(page.locator("body")).toContainText(/Smoke Test User|Мои грузы|Мои клиенты/i);

  await page.getByText(/мои клиенты/i).first().click();
  await expect(page.locator("body")).toContainText(/мои клиенты|всего:/i);

  for (let i = 1; i <= 10; i++) {
    const clientName = `QA Client ${i}`;

    // Click "Новый клиент" button
    await page.getByRole("button", { name: /новый клиент/i }).click();

    // Fill the form in the modal
    await page.getByLabel(/название клиента/i).fill(clientName);
    await page.getByLabel(/компания/i).fill(`Company ${i}`);
    await page.getByLabel(/телефон/i).fill(`+996555000${i.toString().padStart(2, '0')}`);

    // Submit the form
    await page.getByRole("button", { name: /создать клиента/i }).click();

    // Wait for the client to appear in the list
    await expect(page.locator("body")).toContainText(clientName);
  }
});
