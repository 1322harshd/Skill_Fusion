const { test, expect } = require("@playwright/test");
const { mockApi, manualEntry } = require("./helpers");

test("lists the user's growth log entries", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    entries: [manualEntry({ title: "Built a landing page" })],
  });
  await page.goto("/index.html#/log");
  await expect(page.getByText("Built a landing page")).toBeVisible();
});

test("Sync modal offers Connect GitHub when not connected", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { githubConnected: false } });
  await page.goto("/index.html#/log");
  await page.getByRole("button", { name: "Sync GitHub" }).click();
  await expect(page.getByRole("button", { name: "Connect GitHub" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sync now" })).toHaveCount(0);
});

test("Sync modal offers Sync now when GitHub is connected", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    user: { githubConnected: true, githubUrl: "https://github.com/ada" },
  });
  await page.goto("/index.html#/log");
  await page.getByRole("button", { name: "Sync GitHub" }).click();
  await expect(page.getByRole("button", { name: "Sync now" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect GitHub" })).toHaveCount(0);
});

test("activity graph renders one cell per day for 14 weeks", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { githubConnected: false } });
  await page.goto("/index.html#/log");
  await expect(page.locator('[title$="contributions"], [title$="contribution"]')).toHaveCount(98);
});
