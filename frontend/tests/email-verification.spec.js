const { test, expect } = require("@playwright/test");
const { mockApi } = require("./helpers");

test("an unverified user is blocked from the dashboard until they verify", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { isEmailVerified: false } });
  await page.goto("/index.html#/dashboard");

  await expect(page.getByText("Verify your email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resend email" })).toBeVisible();
});

test("an unverified user is blocked from onboarding too", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { isEmailVerified: false } });
  await page.goto("/index.html#/onboarding");

  await expect(page.getByText("Verify your email")).toBeVisible();
});

test("resending verification from the gate hits the API and confirms", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { isEmailVerified: false } });
  await page.goto("/index.html#/dashboard");

  await page.getByRole("button", { name: "Resend email" }).click();
  await expect(page.getByRole("button", { name: "Email sent" })).toBeVisible();
});

test("the verify-email confirmation page itself is never hidden behind the gate", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { isEmailVerified: false } });
  await page.goto("/index.html#/verify-email?token=abc123");

  await expect(page.getByRole("heading", { name: "Email verified" })).toBeVisible();
  await expect(page.getByText("Verify your email")).not.toBeVisible();
});

test("a verified user sees the dashboard normally", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { isEmailVerified: true } });
  await page.goto("/index.html#/dashboard");

  await expect(page.getByText("Verify your email")).not.toBeVisible();
});

test("after verifying, continuing resumes onboarding at persona selection, not the sign-up form", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { isEmailVerified: false, personaTypes: [], baseline: null } });
  await page.goto("/index.html#/verify-email?token=abc123");

  await expect(page.getByRole("heading", { name: "Email verified" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Select all that apply — you can pick more than one")).toBeVisible();
});

test("a user who already picked personas resumes straight at the resume/quiz step", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    user: { isEmailVerified: false, personaTypes: ["Self Learner"], baseline: null },
  });
  await page.goto("/index.html#/verify-email?token=abc123");

  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Upload a resume — or skip it and prove each skill with a quick quiz instead.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Upload a resume/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /No resume, quiz instead/ })).toBeVisible();
});
