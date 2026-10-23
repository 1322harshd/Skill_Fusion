const { test, expect } = require("@playwright/test");
const { mockApi } = require("./helpers");

test("uploading a resume in onboarding step 3 unlocks continue", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { personaTypes: ["Self Learner"], baseline: null } });
  await page.goto("/index.html#/onboarding");

  await expect(page.getByText("Upload a resume — or skip it and prove each skill with a quick quiz instead.")).toBeVisible();

  const continueButton = page.getByRole("button", { name: "Go to Fuse" });
  await expect(continueButton).toBeDisabled();

  await page.getByRole("button", { name: /Upload a resume/ }).click();
  await page.setInputFiles('input[type="file"]', {
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("fake pdf bytes"),
  });

  await expect(page.getByText("resume.pdf")).toBeVisible();
  await expect(continueButton).toBeEnabled();
});

test("a failed upload shows an error and continue stays disabled", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    user: { personaTypes: ["Self Learner"], baseline: null },
    uploadResult: "error",
  });
  await page.goto("/index.html#/onboarding");

  await page.getByRole("button", { name: /Upload a resume/ }).click();
  await page.setInputFiles('input[type="file"]', {
    name: "scanned.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("fake pdf bytes"),
  });

  await expect(page.locator("p.text-red-300", { hasText: "Couldn't find any text in that file." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to Fuse" })).toBeDisabled();
});

test("the quiz option still works without uploading anything", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { personaTypes: ["Self Learner"], baseline: null } });
  await page.goto("/index.html#/onboarding");

  await page.getByRole("button", { name: /No resume, quiz instead/ }).click();
  await expect(page.getByRole("button", { name: "Go to Fuse" })).toBeEnabled();
});

test("the Resume generator page shows upload status and lets you upload", async ({ page }) => {
  await mockApi(page, { signedIn: true });
  await page.goto("/index.html#/resume");

  await expect(page.getByText("No resume on file")).toBeVisible();

  await page.getByRole("button", { name: "Upload resume" }).click();
  await page.setInputFiles('input[type="file"]', {
    name: "my-resume.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("some resume text"),
  });

  await expect(page.getByText("resume.pdf", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Replace" })).toBeVisible();
});

test("the Resume generator page reflects a previously uploaded resume on load", async ({ page }) => {
  await mockApi(page, { signedIn: true, resumeUpload: { filename: "old-resume.pdf", uploadedAt: new Date().toISOString() } });
  await page.goto("/index.html#/resume");

  await expect(page.getByText("old-resume.pdf")).toBeVisible();
  await expect(page.getByRole("button", { name: "Replace" })).toBeVisible();
});
