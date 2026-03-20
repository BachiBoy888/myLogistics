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

    // Wait for the modal dialog to appear
    const modal = page.getByRole("dialog", { name: "Новый клиент" });
    await expect(modal).toBeVisible();

    // Fill the form using properly associated labels
    await modal.getByLabel("Название клиента *").fill(clientName);
    await modal.getByLabel("Компания").fill(`Company ${i}`);
    await modal.getByRole("textbox", { name: "Телефон", exact: true }).fill(`+996555000${i.toString().padStart(2, '0')}`);

    // Submit the form
    await modal.getByRole("button", { name: /создать клиента/i }).click();

    // Wait for the modal to close and client to appear in the list
    await expect(modal).toBeHidden();
    await expect(page.locator("body")).toContainText(clientName);
  }
});