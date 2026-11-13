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
    postDraft = null,
    postHistory = [],
    connectHandle = "swift.fox42",
    connectBanned = false,
    connectWarnCount = 0,
    presence = [],
    roomMessages = [],
    resumeUpload = null,
    uploadResult = "success",
    skillsKnown = null,
    quizSession = null,
    quizLevels = [],
    fusionHistory = [],
    roadmapChosenByFusionId = {},
    moderationReports = [],
    moderationForbidden = false,
    myMatch = { status: "none" },
    conversations = [],
    conversationMessages = {},
    conversationExchanges = {},
    onLayoutSaved = null,
  } = {}
) {
  const baseUser = {
    userId: "u1",
    email: "ada@skillfusion.ai",
    fullName: "Ada Lovelace",
    role: "student",
    isEmailVerified: true,
    personaTypes: ["Designer"],
    baseline: { method: "quiz" },
    skills: [],
    githubUrl: "",
    githubConnected: false,
    ...user,
  };

  // Intercepts every API call the app makes and fakes a response from the
  // fixture data passed in above, matching on URL (and sometimes method).
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
      // Pulls the entry id out of the URL and echoes back the matching
      // fixture entry (if any) merged with the credential verdict.
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
    if (url.includes("/api/fusion/skills/known/")) {
      return skillsKnown ? json(200, { verdicts: skillsKnown }) : json(200, {});
    }
    if (url.includes("/api/fusion/quiz/generate")) {
      return quizSession ? json(200, quizSession) : json(502, { detail: "LLM server unreachable" });
    }
    if (url.includes("/api/fusion/quiz/submit")) {
      return json(200, { levels: quizLevels });
    }
    if (url.includes("/api/fusion/history")) {
      return json(200, { fusions: fusionHistory });
    }
    if (url.includes("/api/roadmap/chosen")) {
      const fusionId = new URL(url).searchParams.get("fusion_id");
      const roadmap = roadmapChosenByFusionId[fusionId];
      return json(200, roadmap ? { roadmap } : {});
    }
    if (url.includes("/api/growth-log/entries")) {
      // POST creates a new manual entry from the request body; GET just
      // returns the fixture list.
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
    if (url.includes("/api/resume/upload")) {
      // Same endpoint handles upload (POST), delete (DELETE), and
      // fetching the current upload's metadata (GET).
      const method = route.request().method();
      if (method === "POST") {
        return uploadResult === "success"
          ? json(201, { filename: "resume.pdf", uploadedAt: new Date().toISOString() })
          : json(400, { detail: "Couldn't find any text in that file." });
      }
      if (method === "DELETE") return json(204, {});
      return json(200, resumeUpload || { filename: null, uploadedAt: null });
    }
    if (url.includes("/api/resume/") && url.includes("/layout")) {
      const body = route.request().postDataJSON();
      if (onLayoutSaved) onLayoutSaved(body.layout);
      const match = url.match(/\/api\/resume\/([^/]+)\/layout/);
      const existing = (resumeHistory.find((d) => d.documentId === (match && match[1])) || resumeDocument || {});
      return json(200, { ...existing, layout: body.layout });
    }
    if (url.includes("/api/resume/") && !url.includes("/export")) {
      return json(200, resumeHistory);
    }
    if (url.includes("/api/posts/generate")) {
      return postDraft
        ? json(201, postDraft)
        : json(502, { detail: "Could not reach the LLM service." });
    }
    if (url.includes("/api/posts/")) {
      const method = route.request().method();
      if (method === "PATCH") {
        // Merges the patch body onto whichever fixture post matches the id
        // in the URL (falling back to the draft), so edits are reflected.
        const body = route.request().postDataJSON();
        const match = url.match(/\/api\/posts\/([^/?]+)/);
        const existing = postHistory.find((p) => p.postId === (match && match[1])) || postDraft || {};
        return json(200, { ...existing, ...body });
      }
      return json(200, postHistory);
    }
    if (url.includes("/api/connect/me")) {
      return json(200, { handle: connectHandle, isBanned: connectBanned, warnCount: connectWarnCount });
    }
    if (url.includes("/api/connect/presence")) {
      if (route.request().method() === "POST") return json(204, {});
      return json(200, presence);
    }
    if (url.includes("/api/connect/room/messages")) {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        return json(201, { id: "rm-created", handle: connectHandle, text: body.text, ts: "now", self: true, hidden: false });
      }
      return json(200, roomMessages);
    }
    if (url.includes("/api/connect/match") && !url.includes("/api/connect/matches") && route.request().method() === "GET") {
      return json(200, myMatch);
    }
    if (url.includes("/api/connect/conversations")) {
      // Sub-routes on a single conversation: /messages (chat history,
      // keyed by conversationId) and /exchange (the mutual-confirm flow).
      // Falling through with no match means "list all conversations".
      const match = url.match(/\/conversations\/([^/]+)\/(messages|exchange)/);
      if (match) {
        const [, conversationId, kind] = match;
        if (kind === "messages") {
          if (route.request().method() === "POST") {
            const body = route.request().postDataJSON();
            return json(201, { id: "pm-created", handle: connectHandle, text: body.text, ts: "now", self: true });
          }
          return json(200, conversationMessages[conversationId] || []);
        }
        if (route.request().method() === "POST") {
          // Confirming moves the exchange to "done"; anything else just
          // flips it to "awaiting-peer" until the other side confirms too.
          const body = route.request().postDataJSON();
          const action = body.action === "confirm" ? "done" : "awaiting-peer";
          return json(200, { status: action });
        }
        return json(200, conversationExchanges[conversationId] || { status: "none" });
      }
      return json(200, conversations);
    }
    if (url.includes("/api/connect/moderation/reports")) {
      // Lets tests simulate a non-staff user hitting the moderation API.
      if (moderationForbidden) return json(403, { detail: "You do not have permission to perform this action." });
      const match = url.match(/\/moderation\/reports\/([^/]+)\/action/);
      if (match) {
        const body = route.request().postDataJSON();
        const existing = moderationReports.find((r) => r.reportId === match[1]) || {};
        return json(200, { ...existing, status: "reviewed", action: body.action });
      }
      return json(200, moderationReports);
    }
    return json(200, {});
  });
}

// Fixture factories below: sensible defaults for each document type,
// overridable per-test so each spec only states what it cares about.
function resumeDoc(overrides = {}) {
  return {
    documentId: "r1",
    jobListing: "",
    resumeSummary: "A builder who ships real, verified work.",
    // Legacy flat shape — kept populated too so fixtures built on this
    // factory still exercise documents generated before the grouped shape.
    resumeBullets: ["Shipped the Growth Log feature", "Connected GitHub OAuth"],
    resumeSkillGroups: [{ category: "Backend", skills: ["Python", "Django"] }],
    resumeProjects: [
      { title: "Growth Log", techStack: "Python, Django", bullets: ["Shipped the Growth Log feature"] },
      { title: "GitHub OAuth", techStack: "OAuth 2.0", bullets: ["Connected GitHub OAuth"] },
    ],
    coverLetter: "Dear hiring team, ...",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function postDoc(overrides = {}) {
  return {
    postId: "p1",
    entryId: "e1",
    tone: "Warm",
    text: "Small progress beats big plans — logging another real one.",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

module.exports = { mockApi, manualEntry, resumeDoc, postDoc };
