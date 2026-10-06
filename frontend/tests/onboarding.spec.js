const { test, expect } = require("@playwright/test");
const { mockApi } = require("./helpers");

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("toggles between sign up and log in", async ({ page }) => {
  await page.goto("/index.html#/onboarding");
  await expect(page.getByText("Join Skill Fusion")).toBeVisible();

  await page.click('button:has-text("Log in")');
  await expect(page.getByText("Sign in to continue")).toBeVisible();

  await page.click('button:has-text("Sign up")');
  await expect(page.getByText("Join Skill Fusion")).toBeVisible();
});

test("sign up requires a full name", async ({ page }) => {
  await page.goto("/index.html#/onboarding");
  await page.fill('input[type="email"]', "ada@skillfusion.ai");
  await page.fill('input[type="password"]', "CorrectHorse1!");
  await page.press('input[type="password"]', "Enter");
  await expect(page.locator("p.text-red-300", { hasText: "Please enter your full name" })).toBeVisible();
});
