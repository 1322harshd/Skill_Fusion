const { test, expect } = require("@playwright/test");
const { mockApi, resumeDoc } = require("./helpers");

test("generates a resume and renders the real response", async ({ page }) => {
  await mockApi(page, { signedIn: true, resumeDocument: resumeDoc() });
  await page.goto("/index.html#/resume");

  await page.fill("textarea", "Backend engineer role");
  await page.getByRole("button", { name: "Generate" }).click();

  await expect(page.getByText("A builder who ships real, verified work.")).toBeVisible();
  await expect(page.getByText("Shipped the Growth Log feature")).toBeVisible();

  await page.getByRole("button", { name: "Cover letter" }).click();
  await expect(page.getByText("Dear hiring team, ...")).toBeVisible();
});

test("shows an error and returns to the input when generation fails", async ({ page }) => {
  await mockApi(page, { signedIn: true, resumeDocument: null });
  await page.goto("/index.html#/resume");

  await page.fill("textarea", "Backend engineer role");
  await page.getByRole("button", { name: "Generate" }).click();

  await expect(page.getByText("Could not reach the LLM service.")).toBeVisible();
  await expect(page.locator("textarea")).toBeVisible();
});

test("can generate a general-purpose resume with no job listing", async ({ page }) => {
  await mockApi(page, { signedIn: true, resumeDocument: resumeDoc() });
  await page.goto("/index.html#/resume");

  // Don't fill the textarea at all.
  await page.getByRole("button", { name: "Generate" }).click();

  await expect(page.getByText("A builder who ships real, verified work.")).toBeVisible();
});

test("reloading the page shows the most recently generated resume", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    resumeHistory: [resumeDoc({ resumeSummary: "Saved from a previous session." })],
  });
  await page.goto("/index.html#/resume");

  await expect(page.getByText("Saved from a previous session.")).toBeVisible();
  // It should land straight on the result, not the empty input form.
  await expect(page.locator("textarea")).toHaveCount(0);
});
