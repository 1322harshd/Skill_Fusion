const { test, expect } = require("@playwright/test");
const { mockApi } = require("./helpers");

function fusion(overrides = {}) {
  return {
    id: "f1",
    a: "Design",
    b: "Code",
    categoryA: "creative",
    categoryB: "tech",
    createdAt: "2026-10-01T00:00:00Z",
    score: { value: 87, rarityLabel: "Rare", demandLabel: "In demand", history: [60, 70, 80, 87] },
    brief: "",
    project: null,
    ...overrides,
  };
}

function roadmap(overrides = {}) {
  return {
    title: "The UI Engineer Roadmap",
    weeks: [
      { week: 1, topic: "Foundations", objectives: [] },
      { week: 2, topic: "Build", objectives: [] },
    ],
    progress_weeks: 1,
    outcome_statement: "Ship a product you designed end-to-end",
    ...overrides,
  };
}

test("shows the empty state when the learner has no fusions", async ({ page }) => {
  await mockApi(page, { signedIn: true, fusionHistory: [] });
  await page.goto("/index.html#/dashboard");

  await expect(page.getByText("Nothing here yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create a fusion" })).toBeVisible();
});

test("reloading straight into the dashboard restores real fusions, not the empty state", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    fusionHistory: [fusion()],
    roadmapChosenByFusionId: { f1: roadmap() },
  });
  await page.goto("/index.html#/dashboard");

  await expect(page.getByText("Nothing here yet")).not.toBeVisible();
  await expect(page.getByText("The UI Engineer Roadmap").first()).toBeVisible();
});

test("a fusion card shows real Growth Log evidence that shares one of its skills", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    fusionHistory: [fusion()],
    roadmapChosenByFusionId: { f1: roadmap() },
    entries: [
      {
        entryId: "e1",
        source: "manual",
        title: "Shipped the fusion portfolio piece",
        description: "",
        sourceUrl: "",
        skillTags: ["Design"],
        competencyTags: [],
        verified: true,
        isPrivate: false,
        loggedAt: "2026-10-20T00:00:00Z",
        credential: null,
      },
    ],
  });
  await page.goto("/index.html#/dashboard");

  await expect(page.getByText("Latest evidence")).toBeVisible();
  await expect(page.getByText("Shipped the fusion portfolio piece")).toBeVisible();
  await expect(page.getByText("Nothing logged yet for this fusion.")).not.toBeVisible();
});

test("a fusion card with no matching evidence says so instead of showing something unrelated", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    fusionHistory: [fusion()],
    roadmapChosenByFusionId: { f1: roadmap() },
    entries: [
      {
        entryId: "e1",
        source: "manual",
        title: "Unrelated marketing campaign note",
        description: "",
        sourceUrl: "",
        skillTags: ["Marketing"],
        competencyTags: [],
        verified: false,
        isPrivate: false,
        loggedAt: "2026-10-20T00:00:00Z",
        credential: null,
      },
    ],
  });
  await page.goto("/index.html#/dashboard");

  await expect(page.getByText("Nothing logged yet for this fusion.")).toBeVisible();
  await expect(page.getByText("Unrelated marketing campaign note")).not.toBeVisible();
});
