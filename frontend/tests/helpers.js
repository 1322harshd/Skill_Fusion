// Mocks the Django API so frontend tests run without the backend.
async function mockApi(page, { signedIn = false, user = {}, entries = [], contributions = null } = {}) {
  const baseUser = {
    userId: "u1",
    email: "ada@skillfusion.ai",
    fullName: "Ada Lovelace",
    isEmailVerified: true,
    personaTypes: ["Designer"],
    baseline: { method: "quiz" },
    skills: [],
    githubUrl: "",
    githubConnected: false,
    ...user,
  };

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    const json = (status, body) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (url.includes("/api/auth/refresh")) {
      return signedIn ? json(200, { accessToken: "test-token" }) : json(401, { detail: "Refresh token missing." });
    }
    if (url.includes("/api/auth/me")) {
      return signedIn ? json(200, { user: baseUser }) : json(401, { detail: "Not authenticated." });
    }
    if (url.includes("/api/growth-log/entries")) {
      return json(200, entries);
    }
    if (url.includes("/api/growth-log/github-contributions")) {
      return contributions ? json(200, { weeks: contributions }) : json(502, { detail: "Not configured." });
    }
    return json(200, {});
  });
}

function manualEntry(overrides = {}) {
  return {
    entryId: "e1",
    source: "manual",
    title: "Built a landing page",
    description: "Hero and nav sections",
    sourceUrl: "",
    skillTags: [],
    competencyTags: [],
    verified: false,
    isPrivate: false,
    loggedAt: new Date().toISOString(),
    credential: null,
    ...overrides,
  };
}

module.exports = { mockApi, manualEntry };
