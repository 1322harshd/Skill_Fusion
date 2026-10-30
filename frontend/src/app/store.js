const F = window.Fusion;

const SKILL_TAGS = ["Web Design", "Prototyping", "SQL", "Analytics", "Copywriting", "Prompting", "Framer Motion", "Public Speaking"];
const COMPETENCIES = ["Time management", "Explaining complexity", "Business communication", "Iteration", "Collaboration"];
function logTag(label, kind) {
  return { label, kind, color: kind === "skill" ? F.colorOf(label) : null };
}

function fromBackendEntry(e) {
  const skillTags = (e.skillTags || []).map((label) => logTag(label, "skill"));
  const competencyTags = (e.competencyTags || []).map((label) => logTag(label, "competency"));
  const pending = e.credential && e.credential.verificationStatus === "pending";
  const failed = e.credential && e.credential.verificationStatus === "failed";
  const source = pending ? "pending" : failed ? "failed" : e.verified ? "verified" : "self-reported";
  return {
    id: e.entryId,
    fusionId: null,
    title: e.title,
    description: e.description,
    date: new Date(e.loggedAt).toLocaleDateString(),
    loggedAt: e.loggedAt,
    tags: [...skillTags, ...competencyTags],
    source,
    verification: e.credential
      ? { link: e.credential.verificationUrl, verified: e.credential.verificationStatus === "verified" }
      : null,
    github: e.source === "github",
    isPrivate: !!e.isPrivate,
  };
}

function fromBackendPost(p) {
  return {
    id: p.postId,
    entryId: p.entryId,
    tone: p.tone,
    status: p.status,
    text: p.text,
  };
}

function buildSeed() {
  // Clean initial state — no mockup/preview data.
  // History, fusions and Growth Log entries are created only
  // after the user completes onboarding / logs real evidence.
  // Wireframes (hi-fi/lo-fi) still show preview layouts, but the
  // live app now starts blank as requested.
  return {
    user: {
      userId: null,
      name: "",
      handle: "",
      email: "",
      role: "student",
      isEmailVerified: false,
      personaTypes: [],
      baseline: null,
      githubUrl: "",
      githubConnected: false,
      skills: [],
    },
    fusions: [],
    logEntries: [],
    githubContributions: null,
    posts: [],
    presence: [],
    roomMessages: [],
    connectProfile: null,
    connectMatchId: null,
    matchStatus: "none",
    privatePeer: null,
    privateMessages: [],
    exchanges: [],
    blocked: [],
    reportedMessages: [],
    messages: [],
    toasts: [],
  };
}

window.Store = (function () {
  let state = buildSeed();
  const listeners = new Set();

  function getSnapshot() {
    return state;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function set(patch) {
    const next = { ...state, ...patch };
    const changed = Object.keys(patch).some((k) => next[k] !== state[k]);
    if (!changed) return;
    state = next;
    listeners.forEach((fn) => fn());
  }

  function useStore() {
    return React.useSyncExternalStore(subscribe, getSnapshot);
  }

  function updateUser(patch) {
    // isEmailVerified only ever goes false -> true for a real account, never back.
    // On the verify-email page, the page's own verify call and the app's background
    // bootstrap() both race to update this; whichever resolves last must not be able
    // to stomp a confirmed true with a stale false from the other.
    const next = { ...state.user, ...patch };
    if (state.user.isEmailVerified && patch.isEmailVerified === false) {
      next.isEmailVerified = true;
    }
    set({ user: next });
  }

  function getFusion(id) {
    return state.fusions.find((f) => f.id === id) || null;
  }

  function addSkillToFusion(fusionId, skill) {
    const f = getFusion(fusionId);
    if (!f || f.addedSkills.includes(skill)) return;
    const next = { ...f, addedSkills: [...f.addedSkills, skill], score: { ...f.score, value: f.score.value + (f.score.recommendation && f.score.recommendation.skill === skill ? f.score.recommendation.delta : 6) } };
    set({ fusions: state.fusions.map((x) => (x.id === fusionId ? next : x)) });
  }

  function refreshFusionScore(fusionId, score) {
    // Backend (/api/score/) is the source of truth: replace the stale copy
    // (e.g. pre-reload heuristic) with the live/cached server score.
    set({ fusions: state.fusions.map((x) => (x.id === fusionId ? { ...x, score } : x)) });
  }

  async function loadGrowthLog() {
    const entries = await window.Api.listGrowthLogEntries();
    set({ logEntries: entries.map(fromBackendEntry) });
  }

  async function addLog(entry) {
    const skillTags = (entry.tags || []).filter((t) => t.kind === "skill").map((t) => t.label);
    const competencyTags = (entry.tags || []).filter((t) => t.kind === "competency").map((t) => t.label);
    const created = await window.Api.createGrowthLogEntry({
      title: entry.title,
      description: entry.description || "",
      skillTags,
      competencyTags,
    });
    const mapped = fromBackendEntry(created);
    set({ logEntries: [mapped, ...state.logEntries] });
    return mapped;
  }

  async function verifyEntry(id, link, issuer = "") {
    const updated = await window.Api.verifyCredential(id, link, issuer);
    const mapped = fromBackendEntry(updated);
    set({ logEntries: state.logEntries.map((e) => (e.id === id ? mapped : e)) });
    return mapped;
  }

  async function loadPosts() {
    const posts = await window.Api.listPosts();
    set({ posts: posts.map(fromBackendPost) });
  }

  async function draftPost(entry, tone, salt = 0) {
    const post = await window.Api.generatePost(entry.id, tone, salt);
    const mapped = fromBackendPost(post);
    const existing = state.posts.find((p) => p.entryId === entry.id && p.status === "draft");
    set({
      posts: existing
        ? state.posts.map((p) => (p.id === existing.id ? mapped : p))
        : [mapped, ...state.posts],
    });
    return mapped.id;
  }

  async function savePost(id, status, text) {
    const patch = { status };
    if (text !== undefined) patch.text = text;
    const updated = await window.Api.updatePost(id, patch);
    const mapped = fromBackendPost(updated);
    set({ posts: state.posts.map((p) => (p.id === id ? mapped : p)) });
    return mapped;
  }

  async function syncGithub() {
    const res = await window.Api.githubImport();
    const mapped = (res.entries || []).map(fromBackendEntry);
    if (mapped.length) set({ logEntries: [...mapped, ...state.logEntries] });
    loadGithubContributions().catch(() => {});
    return mapped;
  }

  async function loadGithubContributions() {
    if (!state.user.githubUrl) return null;
    const res = await window.Api.githubContributions();
    set({ githubContributions: res.weeks || [] });
    return res.weeks;
  }

  function sendMessage(msg) {
    set({ messages: [...state.messages, msg] });
  }

  function chooseRoadmap(fusionId, preview) {
    const f = getFusion(fusionId);
    if (!f || !preview) return;
    set({
      fusions: state.fusions.map((x) =>
        x.id === fusionId
          ? { ...x, roadmap: preview.roadmap, roadmapId: preview.roadmapId || null }
          : x
      ),
    });
    // Persist server-side (locks the row, blocks further tweaks). Fire-and-
    // forget: the UI flow must not block on it, and the token rides along.
    if (preview.roadmapId) {
      window.Api.roadmapChoose(preview.roadmapId).catch((e) => {
        console.warn("[Roadmaps] choose failed to persist —", e && e.message);
      });
    }
  }

  function tasksFor(n) {
    return [
      { id: `t${n}a`, label: `Finish the week ${n} piece`, done: false },
      { id: `t${n}b`, label: "Reflect and log one note in your Growth Log", done: false },
    ];
  }

  function completeWeek(fusionId) {
    const f = getFusion(fusionId);
    if (!f) return;
    const pw = f.roadmap.progressWeeks;
    if (pw > f.roadmap.totalWeeks) return;
    const weeks = f.roadmap.weeks.map((w) => {
      if (w.n === pw) return { ...w, status: "done", tasks: (w.tasks || []).map((t) => ({ ...t, done: true })) };
      if (w.n === pw + 1) return { ...w, status: "current", tasks: tasksFor(w.n) };
      return w;
    });
    set({
      fusions: state.fusions.map((x) =>
        x.id === fusionId ? { ...x, roadmap: { ...x.roadmap, progressWeeks: pw + 1, weeks } } : x
      ),
    });
    // Persist the check-off so it survives a reload (fire-and-forget).
    if (f.roadmapId) {
      window.Api.roadmapProgress(f.roadmapId, pw + 1).catch((e) => {
        console.warn("[Roadmaps] progress failed to persist —", e && e.message);
      });
    }
  }

  async function explainFeedback(a, b, text) {
    // SF-backed feedback via /api/explain/ (backend falls back to a local
    // deterministic template when the model is unreachable).
    return window.Api.explainFeedback(a, b, text);
  }

  // ---- Connect (FR-9/FR-11): all backend-wired via window.Api, polled from components.

  async function loadConnectProfile() {
    const data = await window.Api.connectMe();
    set({ connectProfile: data });
    return data;
  }

  async function sendHeartbeat(statusValue = "active", fusionLabel = "") {
    await window.Api.connectHeartbeat(statusValue, fusionLabel);
  }

  async function loadPresence() {
    const rows = await window.Api.connectPresence();
    set({ presence: rows });
    return rows;
  }

  async function loadRoomMessages() {
    const rows = await window.Api.connectListRoomMessages();
    set({ roomMessages: rows });
    return rows;
  }

  async function sendRoomMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const msg = await window.Api.connectSendRoomMessage(trimmed);
    set({ roomMessages: [...state.roomMessages, msg] });
    return msg;
  }

  async function reportRoomMessage(id) {
    if (state.reportedMessages.includes(id)) return;
    set({ reportedMessages: [...state.reportedMessages, id] });
    await window.Api.connectReportMessage("room", id);
  }

  function applyMatch(data) {
    set({
      connectMatchId: data.matchId,
      matchStatus: data.status,
      privatePeer: data.status === "active" ? { handle: data.peerHandle, fusionLabel: data.fusionLabel } : null,
      privateMessages: data.status === "active" ? state.privateMessages : [],
    });
  }

  async function joinMatch(fusionLabel) {
    const data = await window.Api.connectJoinMatch(fusionLabel);
    applyMatch(data);
    return data;
  }

  async function messagePeer(handle) {
    const data = await window.Api.connectMatchWithPeer(handle);
    applyMatch(data);
    return data;
  }

  async function refreshMatch() {
    if (!state.connectMatchId) return null;
    const data = await window.Api.connectGetMatch(state.connectMatchId);
    applyMatch(data);
    return data;
  }

  async function loadMatchMessages() {
    if (!state.connectMatchId) return;
    const rows = await window.Api.connectListMatchMessages(state.connectMatchId);
    set({ privateMessages: rows });
  }

  async function sendMatchMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || !state.connectMatchId) return null;
    const msg = await window.Api.connectSendMatchMessage(state.connectMatchId, trimmed);
    set({ privateMessages: [...state.privateMessages, msg] });
    return msg;
  }

  async function reportMatchMessage(id) {
    if (state.reportedMessages.includes(id)) return;
    set({ reportedMessages: [...state.reportedMessages, id] });
    await window.Api.connectReportMessage("private", id);
  }

  function setExchangeFor(handle, data) {
    if (!handle) return;
    const next = { handle, status: data.status, peer: data.peer || null };
    const existing = state.exchanges.find((x) => x.handle === handle);
    set({
      exchanges: existing
        ? state.exchanges.map((x) => (x.handle === handle ? next : x))
        : [...state.exchanges, next],
    });
  }

  async function loadExchange() {
    if (!state.connectMatchId || !state.privatePeer) return;
    const data = await window.Api.connectGetExchange(state.connectMatchId);
    setExchangeFor(state.privatePeer.handle, data);
  }

  async function proposeExchange(handle) {
    const data = await window.Api.connectProposeExchange(state.connectMatchId);
    setExchangeFor(handle, data);
  }

  async function finalizeExchange(handle) {
    const data = await window.Api.connectConfirmExchange(state.connectMatchId);
    setExchangeFor(handle, data);
  }

  async function reportPeer(handle) {
    await window.Api.connectReportPeer(handle);
    set({
      blocked: [...state.blocked, handle],
      privatePeer: null,
      connectMatchId: null,
      matchStatus: "closed",
      privateMessages: [],
      exchanges: state.exchanges.filter((x) => x.handle !== handle),
    });
  }

  // ---- Backend (SF) wiring via window.Api (auth-aware, single BASE_URL).
  // Fail-loud: no mock fallback.
  async function fuseRemote(a, b) {
    const data = await window.Api.fuse(a, b);
    const f = data.fusion;
    const fusion = {
      id: f.id, a: f.a, b: f.b,
      categoryA: F.categoryOf(a), categoryB: F.categoryOf(b),
      createdAt: "just now", addedSkills: [],
      score: f.score, brief: f.brief, project: normalizeProject(f.project, a, b),
      roadmap: null,
    };
    set({ fusions: [fusion, ...state.fusions] });
    return fusion;
  }

  function normalizeRoadmap(rm, a, b, progressWeeks = 1) {
    const total = (rm.weeks || []).length;
    const weeks = (rm.weeks || []).map((w, i) => {
      const n = w.week || i + 1;
      const status = n < progressWeeks ? "done" : n === progressWeeks ? "current" : "upcoming";
      return {
        n,
        title: w.topic,
        objectives: w.objectives || [],
        status,
        tasks: status === "current" ? tasksFor(n) : [],
      };
    });
    const over = progressWeeks > total;
    if (over) weeks.forEach((w) => { w.status = "done"; w.tasks = []; });
    return {
      title: rm.title, weeks,
      progressWeeks: over ? total + 1 : Math.min(Math.max(1, progressWeeks), Math.max(total, 1)),
      totalWeeks: total, paused: false,
      outcome_statement: rm.outcome_statement,
      roadmapId: rm.roadmap_id || null,
    };
  }

  // POST /api/roadmap/previews/ -> normalize previews + roadmaps to UI shape.
  async function getPreviewsRemote(fusion, salt = 0) {
    const data = await window.Api.roadmapPreviews(fusion, salt);
    return (data.previews || []).map((p) => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      weeks: p.weeks,
      outcomes: p.outcomes || [],
      roadmapId: p.roadmap_id || null,
      roadmap: normalizeRoadmap(p.roadmap, fusion.a, fusion.b),
    }));
  }

  // SF project briefs have drifted between shapes across versions this session
  // (make_project now returns the full camelCase contract, but older rows hold
  // snake_case scraps like key_deliverables) — normalize once at the store
  // boundary so Project.js can always render.
  function normalizeProject(p, a, b) {
    p = p && typeof p === "object" ? p : {};
    const pick = (...keys) => {
      for (const k of keys) {
        const v = p[k];
        if (typeof v === "string" && v.trim()) return v.trim();
        if (Array.isArray(v) && v.length) return v;
      }
      return null;
    };
    const arr = (...keys) => {
      for (const k of keys) {
        const v = p[k];
        if (Array.isArray(v) && v.length) return v.map(String);
      }
      return null;
    };
    return {
      title: pick("title") || `${a} × ${b} flagship project`,
      client: pick("client", "client_type") || "Self-directed",
      timeline: pick("timeline", "duration") || "2-4 weeks",
      format: pick("format", "format_type") || "Web experience",
      audience: pick("audience") || "Early adopters and reviewers",
      goal: pick("goal", "goal_statement") || (typeof p.expected_outcome === "string" && p.expected_outcome) || `One flagship artifact that proves ${a} × ${b}.`,
      tools: arr("tools") || ["Tools of your trade"],
      deliverables: arr("deliverables", "key_deliverables") || ["A shipped, shareable artifact"],
      expectedOutcome: pick("expectedOutcome") || (typeof p.expected_outcome === "string" && p.expected_outcome) || "Hireable proof of the fusion, not just a certificate.",
      status: p.status || "brief",
    };
  }

  function fromBackendFusion(r) {
    return {
      id: r.id,
      a: r.a,
      b: r.b,
      categoryA: r.categoryA || F.categoryOf(r.a),
      categoryB: r.categoryB || F.categoryOf(r.b),
      createdAt: r.createdAt || "just now",
      addedSkills: r.addedSkills || [],
      score: r.score,
      brief: r.brief,
      project: normalizeProject(r.project, r.a, r.b),
      roadmap: null,
    };
  }

  // GET /api/fusion/history/ -> restore the signed-in user's past fusions.
  // Stored fusions (DB rows) must not clobber this session's live ones; merge
  // by id and keep whichever already has a roadmap but drop duplicates.
  async function loadFusions() {
    const data = await window.Api.fusionHistory();
    const merged = [...state.fusions];
    for (const r of data.fusions || []) {
      const mapped = fromBackendFusion(r);
      const idx = merged.findIndex((f) => f.id === mapped.id);
      // Session-fresh copy wins (it may carry a chosen roadmap from this flow)
      if (idx === -1) merged.push(mapped);
      else merged[idx] = merged[idx].roadmap ? merged[idx] : mapped;
    }
    set({ fusions: merged });
    // Restore each fusion's chosen roadmap (with progress) after a reload —
    // without this the chosen path only lived in memory.
    const restorable = merged.filter((f) => !f.roadmap);
    await Promise.allSettled(restorable.map(async (f) => {
      const res = await window.Api.roadmapChosen(f.id);
      if (res.roadmap) {
        const rm = normalizeRoadmap(res.roadmap, f.a, f.b, res.roadmap.progress_weeks || 1);
        set({
          fusions: state.fusions.map((x) =>
            x.id === f.id ? { ...x, roadmap: rm, roadmapId: rm.roadmapId, constraints: res.roadmap.constraints || [] } : x
          ),
        });
      }
    }));
    return state.fusions;
  }

  async function tweakRoadmap(fusion, pv, newRequest) {
    // Pre-commit change request — SF judges by ONE rule: both skills must
    // survive. Returns {classification, reasoning, diff, updated_constraints}.
    return window.Api.roadmapTweak({
      roadmap_id: pv.roadmapId,
      skill_a: fusion.a,
      skill_b: fusion.b,
      new_request: newRequest,
    });
  }

  return {
    getSnapshot,
    subscribe,
    set,
    useStore,
    updateUser,
    fuseRemote,
    getFusion,
    addSkillToFusion,
    refreshFusionScore,
    addLog,
    verifyEntry,
    savePost,
    draftPost,
    loadPosts,
    sendMessage,
    getPreviewsRemote,
    loadFusions,
    chooseRoadmap,
    completeWeek,
    tweakRoadmap,
    explainFeedback,
    loadConnectProfile,
    sendHeartbeat,
    loadPresence,
    loadRoomMessages,
    sendRoomMessage,
    reportRoomMessage,
    joinMatch,
    messagePeer,
    refreshMatch,
    loadMatchMessages,
    sendMatchMessage,
    reportMatchMessage,
    loadExchange,
    proposeExchange,
    finalizeExchange,
    reportPeer,
    syncGithub,
    loadGrowthLog,
    loadGithubContributions,
    SKILL_TAGS,
    COMPETENCIES,
    logTag,
  };
})();
