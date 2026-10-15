const { test, expect } = require("@playwright/test");
const { mockApi, manualEntry, postDoc } = require("./helpers");

test("drafts a post from a Growth Log entry and renders the real response", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    entries: [manualEntry({ entryId: "e1", title: "Built a landing page" })],
    postDraft: postDoc({ text: "Small progress beats big plans — logging another real one." }),
  });
  await page.goto("/index.html#/posts");

  await page.getByRole("button", { name: /Built a landing page/ }).click();
  await expect(page.locator("textarea")).toHaveValue("Small progress beats big plans — logging another real one.");
});

test("shows an error when drafting fails", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    entries: [manualEntry({ entryId: "e1", title: "Built a landing page" })],
    postDraft: null,
  });
  await page.goto("/index.html#/posts");

  await page.getByRole("button", { name: /Built a landing page/ }).click();
  await expect(page.getByText("Could not reach the LLM service.")).toBeVisible();
});

test("sharing a draft persists the status", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    entries: [manualEntry({ entryId: "e1", title: "Built a landing page" })],
    postDraft: postDoc(),
  });
  await page.goto("/index.html#/posts");

  await page.getByRole("button", { name: /Built a landing page/ }).click();
  await expect(page.locator("textarea")).toHaveValue(postDoc().text);

  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.getByText("Post shared")).toBeVisible();
});
