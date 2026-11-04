const { test, expect } = require("@playwright/test");
const { mockApi } = require("./helpers");

test("an incoming chat request shows accept/decline, not the chat itself", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    myMatch: {
      matchId: "m1",
      status: "requested",
      direction: "incoming",
      fusionLabel: "Design×AI",
      peerHandle: "bold.hawk21",
      closeReason: null,
    },
  });
  await page.goto("/index.html#/connect");

  await expect(page.getByText("Private room")).toBeVisible();
  const dot = page.locator("button", { hasText: "Private room" }).locator("span.bg-\\[var\\(--color-status-active\\)\\]");
  await expect(dot).toBeVisible();

  await page.getByRole("button", { name: "Private room" }).click();
  await expect(page.getByText("bold.hawk21 wants to chat")).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Decline" })).toBeVisible();
});

test("accepting an incoming request opens the chat", async ({ page }) => {
  await mockApi(page, { signedIn: true });
  let accepted = false;
  // GET /connect/match must reflect the handshake resolving (a real backend
  // stops surfacing an ACTIVE match there once it hands off to a
  // Conversation) — a static mock would re-show the stale incoming request
  // on the next poll and clobber the just-accepted state.
  await page.route("**/api/connect/match", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const body = accepted
      ? { status: "none" }
      : {
          matchId: "m1",
          status: "requested",
          direction: "incoming",
          fusionLabel: "Design×AI",
          peerHandle: "bold.hawk21",
          closeReason: null,
        };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.route("**/api/connect/matches/m1/respond", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.action).toBe("accept");
    accepted = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        matchId: "m1",
        status: "active",
        direction: null,
        fusionLabel: "Design×AI",
        peerHandle: "bold.hawk21",
        closeReason: null,
        conversationId: "c1",
      }),
    });
  });
  await page.route("**/api/connect/conversations/c1/messages", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route("**/api/connect/conversations/c1/exchange", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "none" }) });
  });

  await page.goto("/index.html#/connect");
  await page.getByRole("button", { name: "Private room" }).click();
  await page.getByRole("button", { name: "Accept" }).click();

  await expect(page.getByText("bold.hawk21 wants to chat")).not.toBeVisible();
  await expect(page.getByPlaceholder("Message your match…")).toBeVisible();
});

test("the requester sees a waiting state, not a chat, until accepted", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    myMatch: {
      matchId: "m1",
      status: "requested",
      direction: "outgoing",
      fusionLabel: "Design×AI",
      peerHandle: "bold.hawk21",
      closeReason: null,
    },
  });
  await page.goto("/index.html#/connect");
  await page.getByRole("button", { name: "Private room" }).click();

  await expect(page.getByText("Waiting for bold.hawk21…")).toBeVisible();
  await expect(page.getByPlaceholder("Message your match…")).not.toBeVisible();
});

test("declining shows the recipient a different message than the requester would see", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    myMatch: {
      matchId: "m1",
      status: "requested",
      direction: "incoming",
      fusionLabel: "Design×AI",
      peerHandle: "bold.hawk21",
      closeReason: null,
    },
  });
  await page.route("**/api/connect/matches/m1/respond", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        matchId: "m1",
        status: "closed",
        direction: "incoming",
        fusionLabel: "Design×AI",
        peerHandle: null,
        closeReason: "declined",
      }),
    });
  });

  await page.goto("/index.html#/connect");
  await page.getByRole("button", { name: "Private room" }).click();
  await page.getByRole("button", { name: "Decline" }).click();

  await expect(page.getByText("You declined the request.")).toBeVisible();
  await expect(page.getByText("They declined your chat request.")).not.toBeVisible();
});

test("the requester whose request was declined sees it from their own side", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    myMatch: {
      matchId: "m1",
      status: "closed",
      direction: "outgoing",
      fusionLabel: "Design×AI",
      peerHandle: null,
      closeReason: "declined",
    },
  });
  await page.goto("/index.html#/connect");
  await page.getByRole("button", { name: "Private room" }).click();

  await expect(page.getByText("They declined your chat request.")).toBeVisible();

  // Dismissing stays on the Requests tab — that's where "find another
  // match" belongs, not back in the Conversations list.
  await page.getByRole("button", { name: "Find another match" }).click();
  await expect(page.getByText("Find a peer", { exact: true })).toBeVisible();
});

test("messages can't be sent until the request is accepted (backend also enforces this)", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    myMatch: {
      matchId: "m1",
      status: "requested",
      direction: "outgoing",
      fusionLabel: "Design×AI",
      peerHandle: "bold.hawk21",
      closeReason: null,
    },
  });
  await page.goto("/index.html#/connect");
  await page.getByRole("button", { name: "Private room" }).click();

  // No message composer should even be reachable in the waiting state.
  await expect(page.getByPlaceholder("Message your match…")).toHaveCount(0);
});
