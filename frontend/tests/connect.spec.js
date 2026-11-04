const { test, expect } = require("@playwright/test");
const { mockApi } = require("./helpers");

test("conversations and pending requests live in separate tabs", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    conversations: [
      { conversationId: "c1", peerHandle: "bold.hawk21", fusionLabel: "Design×AI", status: "active", blockedByMe: false, lastMessageAt: new Date().toISOString() },
    ],
    myMatch: {
      matchId: "m1",
      status: "requested",
      direction: "incoming",
      fusionLabel: "Marketing×Data",
      peerHandle: "quiet.owl10",
      closeReason: null,
    },
  });
  await page.goto("/index.html#/connect");
  await page.getByRole("button", { name: "Private room" }).click();

  // An incoming request already pending at mount time lands on the
  // Requests tab, not buried in the conversation list.
  await expect(page.getByText("quiet.owl10 wants to chat")).toBeVisible();
  await expect(page.getByText("bold.hawk21")).not.toBeVisible();

  await page.getByRole("button", { name: "Conversations" }).click();
  await expect(page.getByText("bold.hawk21")).toBeVisible();
  await expect(page.getByText("quiet.owl10 wants to chat")).not.toBeVisible();

  await page.getByRole("button", { name: "Requests" }).click();
  await expect(page.getByText("quiet.owl10 wants to chat")).toBeVisible();
});

test("the private room lists every conversation at once, like a DM inbox", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    conversations: [
      { conversationId: "c1", peerHandle: "bold.hawk21", fusionLabel: "Design×AI", status: "active", blockedByMe: false, lastMessageAt: new Date().toISOString() },
      { conversationId: "c2", peerHandle: "quiet.owl10", fusionLabel: "Marketing×Data", status: "active", blockedByMe: false, lastMessageAt: new Date().toISOString() },
    ],
  });
  await page.goto("/index.html#/connect");

  await page.getByRole("button", { name: "Private room" }).click();
  await expect(page.getByText("bold.hawk21")).toBeVisible();
  await expect(page.getByText("quiet.owl10")).toBeVisible();
});

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
  await expect(page.getByText("No conversations yet")).toBeVisible();
  await page.getByRole("button", { name: "+ Find a peer" }).click();
  await expect(page.getByText("Fuse two skills first, then come back to find a match.")).toBeVisible();
});

test("matching on a fusion waits, then shows the peer once active", async ({ page }) => {
  await mockApi(page, { signedIn: true });

  let created = false;
  let pollsSinceCreated = 0;
  await page.route("**/api/connect/match", async (route) => {
    if (route.request().method() === "GET") {
      if (!created) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "none" }) });
      }
      pollsSinceCreated += 1;
      const current = pollsSinceCreated > 2 ? "active" : "waiting";
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          matchId: "m1",
          status: current,
          fusionLabel: "Design×AI",
          peerHandle: current === "active" ? "bold.hawk21" : null,
          conversationId: current === "active" ? "c1" : null,
        }),
      });
    }
    created = true;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ matchId: "m1", status: "waiting", fusionLabel: "Design×AI", peerHandle: null, conversationId: null }),
    });
  });
  await page.route("**/api/connect/conversations/c1/messages", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route("**/api/connect/conversations/c1/exchange", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "none" }) });
  });

  await page.goto("/index.html#/connect");
  await page.waitForFunction(() => window.Store);
  await page.evaluate(() => {
    window.Store.set({ fusions: [{ id: "f1", a: "Design", b: "AI" }] });
  });

  await page.getByRole("button", { name: "Private room" }).click();
  await page.getByRole("button", { name: "+ Find a peer" }).click();
  await page.getByRole("button", { name: "Match on Design×AI" }).click();
  await expect(page.getByText("Waiting for a peer…")).toBeVisible();

  await expect(page.getByText("bold.hawk21").first()).toBeVisible({ timeout: 10000 });
});

test("a completed identity exchange swaps the handle for the real name", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    conversations: [
      {
        conversationId: "c1",
        peerHandle: "wide.sparrow30",
        fusionLabel: "Design×AI",
        status: "active",
        blockedByMe: false,
        lastMessageAt: new Date().toISOString(),
      },
    ],
    conversationMessages: { c1: [{ id: "pm1", handle: "wide.sparrow30", text: "hey there", ts: "now", self: false }] },
    conversationExchanges: { c1: { status: "done", peer: { fullName: "Test User", email: "test2@gmail.com" } } },
  });

  await page.goto("/index.html#/connect");
  await page.getByRole("button", { name: "Private room" }).click();
  await page.getByText("wide.sparrow30").first().click();

  // The anonymous handle gives way to the real name once revealed — in the
  // thread header, the message history, and back in the conversation list.
  await expect(page.getByText("Test User").first()).toBeVisible();
  await expect(page.getByText("test2@gmail.com")).toBeVisible();
  await expect(page.getByText("Identities revealed")).toBeVisible();

  await page.getByRole("button", { name: "All conversations" }).click();
  await expect(page.getByText("Test User").first()).toBeVisible();
});

test("reporting a matched peer blocks the conversation but keeps its history", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    conversations: [
      {
        conversationId: "c1",
        peerHandle: "bold.hawk21",
        fusionLabel: "Design×AI",
        status: "active",
        blockedByMe: false,
        lastMessageAt: new Date().toISOString(),
      },
    ],
    conversationMessages: { c1: [] },
    conversationExchanges: { c1: { status: "none" } },
  });

  await page.route("**/api/connect/peers/bold.hawk21/report", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ reportId: "r1", reason: "", autoFlagged: false, status: "pending", action: "none", createdAt: new Date().toISOString() }),
    });
  });

  await page.goto("/index.html#/connect");

  await page.getByRole("button", { name: "Private room" }).click();
  await expect(page.getByText("bold.hawk21").first()).toBeVisible();
  await page.getByText("bold.hawk21").first().click();

  // A freshly fetched-but-empty exchange ({status: "none"}) must still show
  // the propose button — it previously went truthy and silently rendered
  // nothing once this fetch resolved.
  await expect(page.getByRole("button", { name: "Propose identity exchange" })).toBeVisible();

  await page.getByRole("button", { name: "Report menu" }).click();
  const reportItem = page.getByRole("button", { name: /Report bold.hawk21/ });
  await expect(reportItem).toBeVisible();
  // The dropdown must not be a descendant of a liquid-glass card — that
  // class sets overflow:hidden and previously clipped almost the entire
  // menu to an unreadable sliver.
  const clippedByGlassCard = await reportItem.evaluate((el) => !!el.closest(".liquid-glass"));
  expect(clippedByGlassCard).toBe(false);

  await reportItem.click();
  await expect(page.getByText("Reported — conversation closed")).toBeVisible();
  // The conversation stays — read-only history, not wiped or hidden.
  await expect(page.getByText("the history stays")).toBeVisible();
  await expect(page.getByPlaceholder("Message your match…")).toHaveCount(0);

  await page.getByRole("button", { name: "All conversations" }).click();
  await expect(page.getByRole("button", { name: /bold\.hawk21.*Conversation closed/ })).toBeVisible();
});
