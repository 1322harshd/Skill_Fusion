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

test("logging a certificate with a link verifies it immediately", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { githubConnected: false } });
  await page.goto("/index.html#/log");

  await page.getByRole("button", { name: "Log something" }).click();
  await page.getByPlaceholder("Title — e.g. AWS Certified Cloud Practitioner").fill("AWS Certified Cloud Practitioner");
  await page.getByPlaceholder("Issuer — e.g. Amazon Web Services").fill("Amazon Web Services");
  await page.getByPlaceholder("https://… (verification link)").fill("https://aws.example/certs/ada");

  const logIt = page.getByRole("button", { name: "Log it" });
  await expect(logIt).toBeEnabled();
  await logIt.click();

  await expect(page.getByText("Logged and verified")).toBeVisible();
});

test("Log it stays disabled until a title is entered", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { githubConnected: false } });
  await page.goto("/index.html#/log");

  await page.getByRole("button", { name: "Log something" }).click();
  await expect(page.getByRole("button", { name: "Log it" })).toBeDisabled();

  await page.getByPlaceholder("Title — e.g. AWS Certified Cloud Practitioner").fill("Shipped a feature");
  await expect(page.getByRole("button", { name: "Log it" })).toBeEnabled();
});

test("can add a skill or competency that isn't in the preset list", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { githubConnected: false } });
  await page.goto("/index.html#/log");

  await page.getByRole("button", { name: "Log something" }).click();
  const customInputs = page.getByPlaceholder("Not listed? Add your own…");

  await customInputs.nth(0).fill("Rust");
  await customInputs.nth(0).press("Enter");
  await customInputs.nth(1).fill("Negotiation");
  await page.getByRole("button", { name: "Add" }).nth(1).click();

  const selected = page.locator("text=Selected").locator("..").getByRole("button");
  await expect(selected.filter({ hasText: "Rust" })).toBeVisible();
  await expect(selected.filter({ hasText: "Negotiation" })).toBeVisible();

  // Removable by clicking the chip again.
  await selected.filter({ hasText: "Rust" }).click();
  await expect(page.getByText("Rust")).toHaveCount(0);
});

test("a failed verification shows distinctly and offers a retry, instead of looking self-reported", async ({
  page,
}) => {
  await mockApi(page, {
    signedIn: true,
    user: { githubConnected: false },
    entries: [manualEntry({ entryId: "cert1", title: "AWS Certified Cloud Practitioner" })],
    verifyResult: "failed",
  });
  await page.goto("/index.html#/log");

  await expect(page.getByText("AWS Certified Cloud Practitioner")).toBeVisible();
  await page.getByRole("button", { name: "Add link" }).click();
  await page.getByPlaceholder("https://…").fill("https://aws.example/certs/ada");
  await page.getByRole("button", { name: "Verify" }).click();

  await expect(page.getByText("Verification failed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try a different link" })).toBeVisible();
});
