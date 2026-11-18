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

// Roadmaps.js doesn't load fusions itself — landing on /fuse first triggers
// Store.loadFusions(), which sets fusions into the store before it checks
// each one's chosen roadmap. Waiting on that second (chosen-check) request
// is a deterministic signal that the fusion is already in the store.
async function seedFusionAndGoToRoadmaps(page) {
  await page.goto("/index.html#/fuse");
  await page.waitForResponse((res) => res.url().includes("/api/roadmap/chosen"));
  await page.goto("/index.html#/roadmaps");
}

test("cancelling roadmap generation stops the spinner and offers a retry", async ({ page }) => {
  // previewsResult left unset — the status endpoint stays "pending" forever,
  // simulating the job that never finishes.
  await mockApi(page, { signedIn: true, fusionHistory: [fusion()] });
  await seedFusionAndGoToRoadmaps(page);

  await expect(page.getByText("Finding your path…")).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(page.getByText("Cancelled")).toBeVisible();
  await expect(page.getByText("Finding your path…")).toHaveCount(0);

  // The cancelled job doesn't auto-retry — generation stays stopped until
  // the user explicitly asks again.
  await page.waitForTimeout(500);
  await expect(page.getByText("Cancelled")).toBeVisible();

  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Finding your path…")).toBeVisible();
});

test("roadmap previews load and render once the job completes", async ({ page }) => {
  const previews = [
    {
      id: "p1",
      title: "The UI Engineer Path",
      summary: "Ship a real interface end to end.",
      weeks: 4,
      outcomes: [],
      roadmap_id: "r1",
      roadmap: { weeks: [{ week: 1, topic: "Foundations", objectives: [] }] },
    },
  ];
  await mockApi(page, { signedIn: true, fusionHistory: [fusion()], previewsResult: previews });
  await seedFusionAndGoToRoadmaps(page);

  await expect(page.getByText("The UI Engineer Path")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Finding your path…")).toHaveCount(0);
});
