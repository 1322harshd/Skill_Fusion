// Evidence-gated quiz: SF reads the uploaded resume and decides per skill
// whether a quiz is needed at all.
const { test, expect } = require("@playwright/test");
const { mockApi } = require("./helpers");

const Q_SESSION = (skill) => ({
  session_id: "s1",
  questions: [
    { id: `${skill}-0`, skill, difficulty: "easy", q: `Warm-up about ${skill}?`, options: ["A", "B", "C", "D"], },
    { id: `${skill}-1`, skill, difficulty: "medium", q: `Real question about ${skill}?`, options: ["A", "B", "C", "D"] },
  ],
});

test("resume covers one skill — only the other is quizzed", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    entries: [],
    skillsKnown: [
      { label: "Engineering", known: true, level: 8, source: "resume", reason: "From your resume: \"Senior Software Engineer\"" },
      { label: "Growth", known: false, level: null, source: "resume", reason: "The resume has no clear evidence for this skill." },
    ],
    quizSession: Q_SESSION("Growth"),
    quizLevels: [{ label: "Growth", level: 5, reason: "Quiz: 5/10", levelSource: "quiz" }],
  });
  await page.goto("/index.html#/quiz?skills=Engineering,Growth");

  // quiz generates for Growth only
  await page.getByText("Growth · easy · Q1").waitFor({ timeout: 15000 });
  await expect(page.getByText("Engineering · easy · Q1")).toHaveCount(0);
  await page.click("text=A");
  await page.click("text=B");
  await page.click('button:has-text("Submit answers")');

  await expect(page.getByText("Engineering: 8/10")).toBeVisible();
  await expect(page.getByText(/From your resume/)).toBeVisible();
  await expect(page.getByText("Growth: 5/10")).toBeVisible();
  await expect(page.getByText("Continue to roadmaps")).toBeVisible();
});

test("resume covers both skills — quiz skipped entirely", async ({ page }) => {
  await mockApi(page, {
    signedIn: true,
    entries: [],
    skillsKnown: [
      { label: "Engineering", known: true, level: 8, source: "resume", reason: "From your resume: \"Ten years of backend work\"" },
      { label: "Growth", known: true, level: 6, source: "resume", reason: "From your resume: \"Ran the growth team\"" },
    ],
  });
  await page.goto("/index.html#/quiz?skills=Engineering,Growth");

  await expect(page.getByText("Engineering: 8/10")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Growth: 6/10")).toBeVisible();
  await expect(page.getByText("Submit answers")).toHaveCount(0);
  await expect(page.getByText("Continue to roadmaps")).toBeVisible();
});

test("no sign-in — both skills get the quiz as before", async ({ page }) => {
  await mockApi(page, {
    signedIn: false,
    entries: [],
    quizSession: Q_SESSION("Engineering"),
  });
  await page.goto("/index.html#/quiz?skills=Engineering,Growth");

  await page.getByText("Engineering · easy · Q1").waitFor({ timeout: 15000 });
  await expect(page.getByText("Baseline quiz")).toBeVisible();
});
