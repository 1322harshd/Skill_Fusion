// Mocks the Django API so frontend tests run without the backend.
async function mockApi(
  page,
  {
    signedIn = false,
    user = {},
    entries = [],
    contributions = null,
    resumeDocument = null,
    resumeHistory = [],
    verifyResult = "verified",
  } = {}
) {
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
    if (url.includes("/verify-credential")) {
      const body = route.request().postDataJSON();
      const match = url.match(/entries\/([^/]+)\/verify-credential/);
      const entryId = match ? match[1] : "e-created";
      const existing = entries.find((e) => e.entryId === entryId) || {};
      return json(200, {
        entryId,
        source: existing.source || "manual",
        title: existing.title || "New entry",
        description: existing.description || "",
        sourceUrl: existing.sourceUrl || "",
        skillTags: existing.skillTags || [],
        competencyTags: existing.competencyTags || [],
        verified: verifyResult === "verified",
        isPrivate: existing.isPrivate || false,
        loggedAt: existing.loggedAt || new Date().toISOString(),
        credential: {
          verificationUrl: body.verificationUrl,
          issuer: body.issuer || "",
          verificationStatus: verifyResult,
        },
      });
    }
    if (url.includes("/api/growth-log/entries")) {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        return json(201, {
          entryId: "e-created",
          source: "manual",
          title: body.title,
          description: body.description || "",
          sourceUrl: "",
          skillTags: body.skillTags || [],
          competencyTags: body.competencyTags || [],
          verified: false,
          isPrivate: false,
          loggedAt: new Date().toISOString(),
          credential: null,
        });
      }
      return json(200, entries);
    }
    if (url.includes("/api/growth-log/github-contributions")) {
      return contributions ? json(200, { weeks: contributions }) : json(502, { detail: "Not configured." });
    }
    if (url.includes("/api/resume/generate")) {
      return resumeDocument
        ? json(201, resumeDocument)
        : json(502, { detail: "Could not reach the LLM service." });
    }
    if (url.includes("/api/resume/") && !url.includes("/export")) {
      return json(200, resumeHistory);
    }
    return json(200, {});
  });
}

function resumeDoc(overrides = {}) {
  return {
    documentId: "r1",
    jobListing: "",
    resumeSummary: "A builder who ships real, verified work.",
    resumeBullets: ["Shipped the Growth Log feature", "Connected GitHub OAuth"],
    coverLetter: "Dear hiring team, ...",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
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

module.exports = { mockApi, manualEntry, resumeDoc };
