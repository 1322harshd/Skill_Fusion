const { test, expect } = require("@playwright/test");
const { mockApi, resumeDoc } = require("./helpers");

test("opens the layout editor with a preset seeded from the generated resume", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    user: { skills: [{ label: "Python" }, { label: "React" }] },
    resumeHistory: [resumeDoc()],
  });
  await page.goto("/index.html#/resume");

  await page.getByRole("button", { name: "Edit layout" }).click();
  await expect(page).toHaveURL(/#\/resume\/r1\/edit/);

  const main = page.locator("#main-content");
  await expect(main.getByText("Ada Lovelace")).toBeVisible();
  await expect(main.getByText(/SUMMARY/)).toBeVisible();
  await expect(main.getByText(/A builder who ships real, verified work\./)).toBeVisible();
  await expect(main.getByText(/Shipped the Growth Log feature/)).toBeVisible();
  await expect(main.getByText(/Python · React/)).toBeVisible();
});

test("selecting then clicking a block enters edit mode, and the edit autosaves", async ({ page }) => {
  const saves = [];
  await mockApi(page, {
    signedIn: true,
    user: { skills: [] },
    resumeHistory: [resumeDoc()],
    onLayoutSaved: (layout) => saves.push(layout),
  });
  await page.goto("/index.html#/resume");
  await page.getByRole("button", { name: "Edit layout" }).click();

  const main = page.locator("#main-content");
  const nameBlock = main.getByText("Ada Lovelace");
  // First click selects only — no textarea yet.
  await nameBlock.click();
  await expect(page.locator("textarea")).toHaveCount(0);
  // Wait for the selected-state render (grip handle) to actually land
  // before the second click — otherwise, under load, the second click can
  // beat React's re-render and land on a still-"unselected" closure,
  // reselecting instead of editing.
  await expect(page.locator(".cursor-grab")).toBeVisible();

  // Second click (now selected) enters edit mode.
  await nameBlock.click();
  const textarea = page.locator("textarea");
  await expect(textarea).toBeVisible();
  await textarea.fill("Ada L.");
  await textarea.press("Tab"); // blur, exits edit mode

  await expect(page.locator("textarea")).toHaveCount(0);
  await expect(main.getByText("Ada L.")).toBeVisible();

  // Autosave is debounced ~800ms.
  await expect.poll(() => saves.length, { timeout: 3000 }).toBeGreaterThan(0);
  expect(saves[saves.length - 1].blocks.find((b) => b.id === "name").content).toBe("Ada L.");
});

test("dragging a selected block's grip handle moves it", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { skills: [] }, resumeHistory: [resumeDoc()] });
  await page.goto("/index.html#/resume");
  await page.getByRole("button", { name: "Edit layout" }).click();

  const main = page.locator("#main-content");
  const nameBlock = main.getByText("Ada Lovelace");
  await nameBlock.click(); // select, reveals the grip handle

  const grip = page.locator(".cursor-grab");
  await expect(grip).toBeVisible();
  const before = await nameBlock.boundingBox();

  const gripBox = await grip.boundingBox();
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(gripBox.x + 80, gripBox.y + 60, { steps: 5 });
  await page.mouse.up();

  const after = await nameBlock.boundingBox();
  expect(after.x).not.toBeCloseTo(before.x, 0);
});

test("resizing a selected block's corner handle changes its size", async ({ page }) => {
  await mockApi(page, { signedIn: true, user: { skills: [] }, resumeHistory: [resumeDoc()] });
  await page.goto("/index.html#/resume");
  await page.getByRole("button", { name: "Edit layout" }).click();

  const main = page.locator("#main-content");
  const nameBlock = main.getByText("Ada Lovelace");
  await nameBlock.click(); // select, reveals resize handles

  const before = await nameBlock.boundingBox();
  // The SE handle is a 10px square centered exactly on the block's
  // bottom-right corner (CSS right:-5px/bottom:-5px on a 10px element).
  const seX = before.x + before.width;
  const seY = before.y + before.height;

  await page.mouse.move(seX, seY);
  await page.mouse.down();
  await page.mouse.move(seX + 60, seY + 40, { steps: 5 });
  await page.mouse.up();

  const after = await nameBlock.boundingBox();
  expect(after.width).toBeGreaterThan(before.width + 30);
  expect(after.height).toBeGreaterThan(before.height + 20);
});
