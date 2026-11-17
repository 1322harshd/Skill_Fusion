const { test, expect } = require("@playwright/test");
const { mockApi } = require("./helpers");

// Table-driven: runs the same "nav link scrolls to section" check for each entry.
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

test("the landing demo previews locally, with no backend call, and points to sign-up", async ({ page }) => {
  // Every real feature now requires an account, so the "try it" demo must
  // never hit the real fuse endpoint — this fails loudly if it ever does
  // again. (The app's own bootstrap() session check on page load does hit
  // /api/auth/refresh regardless of route — that's unrelated and expected.)
  let calledFuse = false;
  await page.route("**/api/fusion/**", (route) => { calledFuse = true; route.abort(); });

  await page.goto("/index.html#/demo");
  // Both "skill one"/"skill two" chip groups list the same skill names, so
  // scope each click to its own group rather than matching by text alone.
  const groups = page.locator(".grid.grid-cols-1.gap-8 > div");
  await groups.nth(0).getByRole("button", { name: "Design", exact: true }).click();
  await groups.nth(1).getByRole("button", { name: "Code", exact: true }).click();
  await page.click('button:has-text("Fuse")');

  await expect(page.getByText(/rarer than the average pair/)).toBeVisible();
  await expect(page.getByText(/sign up for SF's live brief/)).toBeVisible();
  expect(calledFuse).toBe(false);
});
