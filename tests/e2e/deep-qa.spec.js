import { test, expect } from "@playwright/test";

test("deep QA: login and create 10 clients", async ({ page }) => {
  await page.goto("/");

  await page.getByPlaceholder(/логин|login/i).fill("test_smoke");
  await page.getByPlaceholder(/пароль|password/i).fill("Smoke123!");
  await page.getByRole("button", { name: /войти|login|sign in/i }).click();

  await expect(page.locator("body")).toContainText(/Smoke Test User|Мои грузы|Мои клиенты/i);

  const clientsLink = page.getByText(/мои клиенты/i).first();
  await clientsLink.click();

  await expect(page.locator("body")).toContainText(/клиент|clients|мои клиенты/i);

  for (let i = 1; i <= 10; i++) {
    const clientName = `QA Client ${i}`;

    const addButton = page.getByRole("button", { name: /добавить|создать|add|new/i }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    const nameInput = page.getByPlaceholder(/имя|название|client name|name/i).first();
    await expect(nameInput).toBeVisible();
    await nameInput.fill(clientName);

    const saveButton = page.getByRole("button", { name: /сохранить|создать|save|add/i }).first();
    await saveButton.click();

    await expect(page.locator("body")).toContainText(clientName);
  }
});
