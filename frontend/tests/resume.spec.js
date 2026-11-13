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

test("can regenerate the resume against a new job listing", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    resumeHistory: [resumeDoc({ jobListing: "Backend engineer role" })],
  });
  await page.goto("/index.html#/resume");

  await expect(page.getByText("A builder who ships real, verified work.")).toBeVisible();

  // Pre-fills the textarea with the current listing rather than starting blank.
  await page.getByRole("button", { name: "New job description" }).click();
  await expect(page.locator("textarea")).toHaveValue("Backend engineer role");

  // Cancel backs out to the existing result without generating anything new.
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator("textarea")).toHaveCount(0);
  await expect(page.getByText("A builder who ships real, verified work.")).toBeVisible();
});

test("a legacy document with only flat bullets still renders via the fallback", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    user: { skills: [{ label: "Python" }, { label: "React" }] },
    resumeHistory: [resumeDoc({ resumeSkillGroups: [], resumeProjects: [] })],
  });
  await page.goto("/index.html#/resume");

  await expect(page.getByText("A builder who ships real, verified work.")).toBeVisible();
  // Falls back to the flat user.skills line, not grouped categories.
  await expect(page.getByText("Python · React")).toBeVisible();
  // Falls back to "Highlights" with the flat bullet list, not "Projects".
  await expect(page.getByText("Highlights")).toBeVisible();
  await expect(page.getByText("Shipped the Growth Log feature")).toBeVisible();
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
