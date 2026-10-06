const { test, expect } = require("@playwright/test");
const { mockApi } = require("./helpers");

const NAV_SECTIONS = [
  ["How It Works", "how-it-works"],
  ["Features", "capabilities"],
  ["Community", "community"],
  ["Pricing", "pricing"],
];

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

for (const [label, id] of NAV_SECTIONS) {
  test(`nav "${label}" routes to and shows #${id}`, async ({ page }) => {
    await page.goto("/index.html");
    await page.click(`nav[aria-label="Main navigation"] a:has-text("${label}")`);
    await expect(page).toHaveURL(new RegExp(`#/${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  });
}

test('"Start Fusing" opens the onboarding screen', async ({ page }) => {
  await page.goto("/index.html");
  await page.click('nav[aria-label="Main navigation"] a:has-text("Start Fusing")');
  await expect(page).toHaveURL(/#\/onboarding$/);
  await expect(page.locator('input[type="email"]')).toBeVisible();
});
