const { test, expect } = require("@playwright/test");
const { mockApi } = require("./helpers");

test("guest profile button is disabled when signed out", async ({ page }) => {
  await mockApi(page, { signedIn: false });
  await page.goto("/index.html#/onboarding");
  const guest = page.getByRole("button", { name: "Guest" });
  await expect(guest).toBeDisabled();
});

test("profile button opens the profile sheet when signed in", async ({ page }) => {
  await mockApi(page, { signedIn: true });
  await page.goto("/index.html#/log");
  const profile = page.getByRole("button", { name: "Open profile" });
  await expect(profile).toBeEnabled();
  await profile.click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
