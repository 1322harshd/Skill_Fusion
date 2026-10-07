const { test, expect } = require("@playwright/test");

test("landing page loads and nav works", async ({ page }) => {
  await page.goto("/index.html");
  await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible();
});
