const { test, expect } = require("@playwright/test");
const { mockApi } = require("./helpers");

function report(overrides = {}) {
  return {
    reportId: "r1",
    reason: "harassment",
    autoFlagged: false,
    status: "pending",
    action: "none",
    createdAt: new Date().toISOString(),
    roomMessageId: null,
    roomMessageText: null,
    privateMessageId: null,
    privateMessageText: null,
    targetHandle: "swift.fox42",
    ...overrides,
  };
}

test("a non-admin user doesn't see the Moderation nav link", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { role: "student" } });
  await page.goto("/index.html#/dashboard");

  await expect(page.getByRole("link", { name: "Moderation" })).not.toBeVisible();
});

test("an admin sees the Moderation nav link and an empty queue shows as clear", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { role: "admin" }, moderationReports: [] });
  await page.goto("/index.html#/dashboard");

  await page.getByRole("link", { name: "Moderation" }).click();
  await expect(page.getByText("Nothing pending — the queue is clear.")).toBeVisible();
});

test("shows the reported room message text and warns the user", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    user: { role: "admin" },
    moderationReports: [report({ roomMessageText: "you fucking idiot", autoFlagged: true })],
  });
  await page.goto("/index.html#/moderation");

  await expect(page.getByText("swift.fox42")).toBeVisible();
  await expect(page.getByText("Auto-flagged")).toBeVisible();
  await expect(page.getByText('"you fucking idiot"')).toBeVisible();

  await page.getByRole("button", { name: "Warn" }).click();
  await expect(page.getByText("User warned")).toBeVisible();
  await expect(page.getByText("swift.fox42")).not.toBeVisible();
});

test("shows reported private message text distinctly and bans the user", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    user: { role: "admin" },
    moderationReports: [report({ privateMessageText: "unwelcome message", reason: "harassment" })],
  });
  await page.goto("/index.html#/moderation");

  await expect(page.getByText("Private room")).toBeVisible();
  await expect(page.getByText('"unwelcome message"')).toBeVisible();
  await expect(page.getByText("Reason: harassment")).toBeVisible();

  await page.getByRole("button", { name: "Ban" }).click();
  await expect(page.getByText("User banned")).toBeVisible();
});

test("dismissing a report removes it from the queue", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    user: { role: "admin" },
    moderationReports: [report()],
  });
  await page.goto("/index.html#/moderation");

  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByText("Report dismissed")).toBeVisible();
  await expect(page.getByText("Nothing pending — the queue is clear.")).toBeVisible();
});

test("a non-admin navigating here directly sees a staff-only message, not the queue", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { role: "student" }, moderationForbidden: true });
  await page.goto("/index.html#/moderation");

  await expect(page.getByText("Staff only")).toBeVisible();
});
