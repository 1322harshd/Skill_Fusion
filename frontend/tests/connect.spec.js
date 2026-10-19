const { test, expect } = require("@playwright/test");
const { mockApi } = require("./helpers");

test("open room lists presence and sends a message", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    presence: [{ handle: "quiet.owl10", status: "active", fusionLabel: "Design×AI" }],
    roomMessages: [{ id: "rm1", handle: "quiet.owl10", text: "Hey room", ts: "now", self: false }],
  });
  await page.goto("/index.html#/connect");

  await expect(page.getByText("quiet.owl10").first()).toBeVisible();
  await expect(page.getByText("Hey room")).toBeVisible();

  await page.getByPlaceholder("Drop a note for the room…").fill("Shipping something today");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Shipping something today")).toBeVisible();
});

test("reporting a room message hides it locally", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    roomMessages: [{ id: "rm1", handle: "quiet.owl10", text: "Hey room", ts: "now", self: false }],
  });
  await page.goto("/index.html#/connect");

  await expect(page.getByText("Hey room")).toBeVisible();
  await page.getByRole("button", { name: "Report message" }).click();
  await expect(page.getByText("Reported — removed for now.")).toBeVisible();
});

test("private room prompts to fuse first when there are no fusions", async ({ page }) => {
  await mockApi(page, { signedIn: true });
  await page.goto("/index.html#/connect");

  await page.getByRole("button", { name: "Private room" }).click();
  await expect(page.getByText("Fuse two skills first, then come back to find a match.")).toBeVisible();
});

test("matching on a fusion waits, then shows the peer once active", async ({ page }) => {
  await mockApi(page, { signedIn: true });

  await page.route("**/api/connect/match", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ matchId: "m1", status: "waiting", fusionLabel: "Design×AI", peerHandle: null }),
    });
  });
  let pollCalls = 0;
  await page.route("**/api/connect/matches/m1", async (route) => {
    pollCalls += 1;
    const status = pollCalls > 1 ? "active" : "waiting";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        matchId: "m1",
        status,
        fusionLabel: "Design×AI",
        peerHandle: status === "active" ? "bold.hawk21" : null,
      }),
    });
  });
  await page.route("**/api/connect/matches/m1/messages", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route("**/api/connect/matches/m1/exchange", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "none" }) });
  });

  await page.goto("/index.html#/connect");
  await page.waitForFunction(() => window.Store);
  await page.evaluate(() => {
    window.Store.set({ fusions: [{ id: "f1", a: "Design", b: "AI" }] });
  });

  await page.getByRole("button", { name: "Private room" }).click();
  await page.getByRole("button", { name: "Match on Design×AI" }).click();
  await expect(page.getByText("Waiting for a peer…")).toBeVisible();

  await expect(page.getByText("bold.hawk21").first()).toBeVisible({ timeout: 10000 });
});

test("reporting a matched peer closes the conversation", async ({ page }) => {
  await mockApi(page, { signedIn: true });

  await page.route("**/api/connect/peers/bold.hawk21/report", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ reportId: "r1", reason: "", autoFlagged: false, status: "pending", action: "none", createdAt: new Date().toISOString() }),
    });
  });

  await page.goto("/index.html#/connect");
  await page.waitForFunction(() => window.Store);
  await page.evaluate(() => {
    window.Store.set({
      fusions: [{ id: "f1", a: "Design", b: "AI" }],
      connectMatchId: "m1",
      matchStatus: "active",
      privatePeer: { handle: "bold.hawk21", fusionLabel: "Design×AI" },
    });
  });

  await page.route("**/api/connect/matches/m1/messages", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route("**/api/connect/matches/m1/exchange", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "none" }) });
  });

  await page.getByRole("button", { name: "Private room" }).click();
  await expect(page.getByText("bold.hawk21").first()).toBeVisible();

  await page.getByRole("button", { name: "Report menu" }).click();
  await page.getByRole("button", { name: /Report bold.hawk21/ }).click();
  await expect(page.getByText("Reported — conversation closed")).toBeVisible();
  await expect(page.getByText("Find a peer")).toBeVisible();
});
