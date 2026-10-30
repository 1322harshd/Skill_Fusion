const { test, expect } = require("@playwright/test");
const { mockApi } = require("./helpers");

test("clicking a presence avatar shows their fused skills, streak and a message button", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    presence: [{ handle: "quiet.owl10", status: "active", fusionLabel: "Design×AI", streak: 5 }],
  });
  await page.goto("/index.html#/connect");

  await page.getByRole("button", { name: /quiet.owl10/ }).click();

  await expect(page.getByText("5-day streak")).toBeVisible();
  await expect(page.getByRole("button", { name: "Message privately" })).toBeVisible();
  await expect(page.locator(".liquid-glass-strong", { hasText: "quiet.owl10" })).toBeVisible();
});

test("a zero streak and a peer with no current fusion show honest fallback text", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    presence: [{ handle: "quiet.owl10", status: "idle", fusionLabel: "", streak: 0 }],
  });
  await page.goto("/index.html#/connect");

  await page.getByRole("button", { name: /quiet.owl10/ }).click();

  await expect(page.getByText("No active streak")).toBeVisible();
  await expect(page.getByText("Not fusing right now")).toBeVisible();
});

test("message privately starts a direct match and switches to the private room", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    presence: [{ handle: "quiet.owl10", status: "active", fusionLabel: "Design×AI", streak: 3 }],
  });
  await page.route("**/api/connect/peers/quiet.owl10/match", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ matchId: "m1", status: "active", fusionLabel: "Design×AI", peerHandle: "quiet.owl10" }),
    });
  });
  await page.route("**/api/connect/matches/m1/messages", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route("**/api/connect/matches/m1/exchange", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "none" }) });
  });

  await page.goto("/index.html#/connect");
  await page.getByRole("button", { name: /quiet.owl10/ }).click();
  await page.getByRole("button", { name: "Message privately" }).click();

  await expect(page.getByRole("button", { name: "Private room" })).toHaveClass(/bg-white/);
  await expect(page.getByText("quiet.owl10").first()).toBeVisible();
});

test("messaging a peer who's already busy shows an error and stays in the open room", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    presence: [{ handle: "quiet.owl10", status: "active", fusionLabel: "Design×AI", streak: 3 }],
  });
  await page.route("**/api/connect/peers/quiet.owl10/match", async (route) => {
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ detail: "That peer is already in a conversation." }),
    });
  });

  await page.goto("/index.html#/connect");
  await page.getByRole("button", { name: /quiet.owl10/ }).click();
  await page.getByRole("button", { name: "Message privately" }).click();

  await expect(page.getByText("That peer is already in a conversation.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Message privately" })).toBeVisible();
});

test("clicking a message bubble's avatar opens the same profile popup", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    presence: [{ handle: "quiet.owl10", status: "active", fusionLabel: "Design×AI", streak: 7 }],
    roomMessages: [{ id: "rm1", handle: "quiet.owl10", text: "hey room", ts: "now", self: false }],
  });
  await page.goto("/index.html#/connect");

  await page.getByRole("button", { name: "View quiet.owl10" }).click();

  await expect(page.getByText("7-day streak")).toBeVisible();
});

test("a message from someone no longer online still opens a popup with honest fallbacks", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    presence: [],
    roomMessages: [{ id: "rm1", handle: "gone.fox12", text: "hey room", ts: "now", self: false }],
  });
  await page.goto("/index.html#/connect");

  await page.getByRole("button", { name: "View gone.fox12" }).click();

  await expect(page.getByText("Streak unknown")).toBeVisible();
  await expect(page.getByText("Not fusing right now")).toBeVisible();
});
