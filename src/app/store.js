const F = window.Fusion;

const THIRD_SKILLS = {
  tech: ["AI", "Automation", "Data"],
  creative: ["Motion", "Storytelling", "Illustration"],
  business: ["Sales", "Strategy", "Pricing"],
  science: ["Statistics", "Research", "Neuroscience"],
  comm: ["Writing", "Public Speaking", "Community"],
};

const CURATED_OUTCOMES = {
  "Design×Code": "Ship a product you designed end-to-end",
  "Code×Design": "Ship a product you designed end-to-end",
  "Marketing×Data": "Run campaigns you can prove worked",
  "Data×Marketing": "Run campaigns you can prove worked",
  "Content×Marketing": "Build a channel that grows itself",
  "Sales×AI": "Sell with an AI copilot on your side",
  "Writing×AI": "Publish with an AI writing partner",
  "Design×AI": "Design AI-native products",
  "Code×AI": "Build AI features that actually ship",
};

const GENERIC_OUTCOMES = [
  (a, b) => `Do ${b} work that carries your ${a} edge`,
  (a, b) => `Turn your ${a} instinct into ${b} results`,
  (a, b) => `Become the rare ${a} + ${b} hire`,
];

function makeHistory(value, seed) {
  // No fake past — history starts at creation.
  // Wireframes show a 6-point preview for layout, but live data
  // grows only from real verified / logged activity.
  return [value];
}

function makeScore(a, b) {
  const seed = F.hash(a + "×" + b);
  const rarity = 0.55 + (seed % 400) / 1000;
  const demand = 0.45 + ((seed >> 4) % 400) / 1000;
  const value = Math.round((rarity * 0.45 + demand * 0.55) * 100);

  const rarityLabel = rarity >= 0.8 ? "Exceptional" : rarity >= 0.65 ? "Rare" : rarity >= 0.5 ? "Uncommon" : "Common";
  const demandLabel = demand >= 0.75 ? "In demand" : demand >= 0.6 ? "Steady" : demand >= 0.45 ? "Growing" : "Emerging";

  const explanation = [
    `Very few people lead with ${a} and ${b} together, so you stand out before you even talk to a recruiter.`,
    `Jobs asking for this blend are ${demandLabel.toLowerCase()}; when one appears, competition is thinner than for either skill alone.`,
    `The pair reads as a full capability — ${a} gives the depth, ${b} gives the proof — instead of two vague keywords.`,
  ];

  const cat = F.categoryOf((seed & 1) ? a : b);
  const pool = THIRD_SKILLS[cat];
  const pick = pool[(seed >> 6) % pool.length];
  const skill = pick === a || pick === b ? pool[(seed >> 9) % pool.length] : pick;
  const delta = 8 + ((seed >> 3) % 9);

  return { value, rarity, demand, rarityLabel, demandLabel, explanation, recommendation: { skill, delta, category: cat }, history: makeHistory(value, seed) };
}

function makeRoadmap(a, b, opts = {}) {
  const seed = F.hash(a + "×" + b + (opts.salt ? "-" + opts.salt : ""));
  const n = opts.totalWeeks || 6 + (seed % 3); // 6-8 weeks
  const title =
    opts.title ||
    CURATED_OUTCOMES[`${a}×${b}`] ||
    GENERIC_OUTCOMES[seed % GENERIC_OUTCOMES.length](a, b);
  const progressWeeks = 1;
  const weeks = [];
  const topics = [
    (i) => `Get fluent in ${b}, applied to ${a}`,
    (i) => `First artifact — a small ${b} piece with your ${a} fingerprint`,
    (i) => `Core skill — the ${b} patterns most ${a} people miss`,
    (i) => `Your style — where ${a} meets ${b}`,
    (i) => `The flagship project brief`,
    (i) => `Ship it — build, refine, document`,
    (i) => `Publish + sync to GitHub — earn the verified badge`,
    (i) => `Positioning — portfolio, interviews, next moves`,
  ];
  for (let i = 0; i < n; i++) {
    const wk = i + 1;
    const status = wk < progressWeeks ? "done" : wk === progressWeeks ? "current" : "upcoming";
    weeks.push({
      n: wk,
      title: topics[i % topics.length](i),
      objectives: [
        i === 0 ? `Name the three things ${a} gives ${b} work` : `Apply ${b} to one ${a} scenario you actually care about`,
        i === 0 ? `Skim five real listings that want this blend` : `Collect one example from the field to study`,
      ],
      status,
      tasks:
        status === "current"
          ? [
              { id: `t${wk}a`, label: `Complete the ${a} piece for week ${wk}`, done: false },
              { id: `t${wk}b`, label: "Reflect and log one note in your Growth Log", done: true },
            ]
          : [],
    });
  }
  return { title, weeks, progressWeeks, totalWeeks: n, paused: false };
}

function makeBrief(a, b, score) {
  const outcome = CURATED_OUTCOMES[`${a}×${b}`] || GENERIC_OUTCOMES[F.hash(a + b) % GENERIC_OUTCOMES.length](a, b);
  return {
    lede: `When ${a} and ${b} sit side by side they stop being two keywords and start being one capability — ${outcome}.`,
    complementarity: [
      `${a} points at the problem; ${b} is how you actually move it.`,
      `Most people carry one or the other. Holding both makes you the person who ships the middle.`,
    ],
    applications: [
      `A portfolio piece that pairs ${a} thinking with ${b} craft`,
      `Interview stories built on a real ${a} × ${b} artifact`,
      `A role or service that only this blend can fill`,
    ],
    industries: ["Product teams", "Studios & agencies", "Early-stage startups"],
    insights: [
      `Your rarity signal reads ${(score.rarityLabel || "rare").toLowerCase()} — this pair stands out before you say a word.`,
      `Demand reads ${(score.demandLabel || "steady").toLowerCase()}, so the blend itself matters more than polishing either side alone.`,
    ],
  };
}

function makeProject(a, b) {
  const seed = F.hash(a + "×" + b);
  const formats = ["Portfolio artifact", "Product prototype", "Case study", "Launch piece"];
  const format = formats[seed % formats.length];
  const tools = [a, b, "GitHub", "Notion"];
  if (F.categoryOf(a) === "tech") tools.push("API docs");
  if (F.categoryOf(b) === "creative") tools.push("Figma");
  return {
    title: `${a} × ${b} — the flagship piece`,
    client: "Modeled on hiring-manager needs",
    timeline: `${4 + (seed % 3)} weeks`,
    format,
    audience: "Future teammates and hiring managers",
    goal: `${a} meets ${b}: build the one piece that proves this combination earns a place on a team.`,
    tools: [...new Set(tools)],
    deliverables: ["Working artifact", "Short write-up", "Published link"],
    expectedOutcome: "A piece you can open in interviews — and the verified badge that comes from shipping it.",
  };
}

function makeFusion(a, b) {
  const seed = F.hash(a + "×" + b);
  const score = makeScore(a, b);
  return {
    id: "f" + seed,
    a,
    b,
    categoryA: F.categoryOf(a),
    categoryB: F.categoryOf(b),
    createdAt: "2 days ago",
    addedSkills: [],
    score,
    brief: makeBrief(a, b, score),
    roadmap: makeRoadmap(a, b),
    project: makeProject(a, b),
  };
}

const SKILL_TAGS = ["Web Design", "Prototyping", "SQL", "Analytics", "Copywriting", "Prompting", "Framer Motion", "Public Speaking"];
const COMPETENCIES = ["Time management", "Explaining complexity", "Business communication", "Iteration", "Collaboration"];
function logTag(label, kind) {
  return { label, kind, color: kind === "skill" ? F.colorOf(label) : null };
}

function draftFor(entry, tone, salt = 0) {
  const t = tone || "Warm";
  const openers = {
    Professional: [
      "I've been quietly building toward this one.",
      "Sharing the work, not just the result.",
      "A small entry for the log, a real one for the skill set.",
    ],
    Warm: [
      "Small progress beats big plans — logging another.",
      "Documenting the unglamorous middle.",
      "Another week, another thing actually done.",
    ],
    Punchy: [
      "Proof that rare combinations pay off:",
      "Rare pair. Real output. Logged:",
      "Don't call it a hobby. It's a fusion:",
    ],
  };
  const closers = {
    Professional: [
      `Filed under ${entry.tags && entry.tags[0] ? entry.tags[0].label : "growth"}. Building in public.`,
      "The boring version worked. Logging it anyway.",
      "Documented so the next one is faster.",
    ],
    Warm: ["On to the next piece.", "The evidence keeps stacking.", "Logged, tagged, moving on."],
    Punchy: ["The rare-pair bet keeps compounding.", "That's one more proof point.", "Combinations > credentials."],
  };
  const o = openers[t][salt % openers[t].length];
  const c = closers[t][salt % closers[t].length];
  return `${o}\n\n${entry.title}${entry.description ? " — " + entry.description : ""}\n\n${c}`;
}

function buildSeed() {
  // Clean initial state — no mockup/preview data.
  // History, fusions and Growth Log entries are created only
  // after the user completes onboarding / logs real evidence.
  // Wireframes (hi-fi/lo-fi) still show preview layouts, but the
  // live app now starts blank as requested.
  return {
    user: {
      name: "",
      handle: "",
      personaTypes: [],
      baseline: null,
      githubUrl: "",
      skills: [],
    },
    fusions: [],
    logEntries: [],
    posts: [],
    peers: [],
    presence: [],
    roomMessages: [],
    privatePeer: null,
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
    set({ user: { ...state.user, ...patch } });
  }

  function fuse(a, b) {
    const fusion = makeFusion(a, b);
    fusion.id = "f" + F.hash(a + "×" + b) + "-" + state.fusions.length;
    set({ fusions: [fusion, ...state.fusions] });
    return fusion;
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

  function addLog(entry) {
    set({ logEntries: [{ ...entry, id: "l" + Date.now() }, ...state.logEntries] });
  }

  function verifyEntry(id, link) {
    set({
      logEntries: state.logEntries.map((e) =>
        e.id === id ? { ...e, source: "verified", verification: { link, verified: true } } : e
      ),
    });
  }

  function addPost(post) {
    set({ posts: [{ ...post, id: "p" + Date.now() }, ...state.posts] });
  }

  function savePost(id, status) {
    set({ posts: state.posts.map((p) => (p.id === id ? { ...p, status } : p)) });
  }

  function draftPost(entry, tone, salt = 0) {
    const text = draftFor(entry, tone, salt);
    const existing = state.posts.find((p) => p.entryId === entry.id && p.status === "draft");
    if (existing) {
      set({ posts: state.posts.map((p) => (p.id === existing.id ? { ...p, text, tone, salt } : p)) });
      return existing.id;
    }
    const post = { id: "p" + Date.now(), entryId: entry.id, tone, status: "draft", text, salt };
    addPost(post);
    return post.id;
  }

  function syncGithub() {
    const f = state.fusions[0];
    const entry = {
      id: "l" + Date.now(),
      fusionId: f ? f.id : null,
      title: "Synced from GitHub",
      description: "Commits and contributions pulled in from your public activity.",
      date: "Today",
      tags: [logTag("GitHub", "skill"), logTag("Collaboration", "competency")],
      source: "verified",
      verification: { link: state.user.githubUrl || "https://github.com", verified: true },
      github: true,
    };
    set({ logEntries: [entry, ...state.logEntries] });
    return entry;
  }

  function buildResume(listing) {
    const user = state.user;
    const skills = (user.skills || []).map((s) => s.label);
    const lead = skills.slice(0, 2);
    const evidence = state.logEntries
      .slice(0, 5)
      .map((e) => ({ title: e.title, description: e.description, date: e.date, source: e.source }));
    const seed = F.hash(listing || "");
    const focus = (seed % 3 === 0 ? lead[0] : seed % 3 === 1 ? lead[1] : lead.join(" and ")) || "my skills";
    return {
      headline: `${user.name} — ${lead.join(" × ")}`,
      summary: `I build at the intersection of ${lead.join(" and ") || "two disciplines"}. My work is grounded in shipped artifacts, not titles — each piece below is real, documented, and verified.`,
      focus,
      skills,
      evidence,
      coverLetter: `Dear hiring team,\n\nYour listing caught my eye because it asks for ${focus} — exactly the combination I've been deliberately building. I don't just list these skills; I've shipped projects that require holding both at once.\n\nIn my Growth Log you'll find documented, verified evidence: projects, milestones, and the rare-pair thinking behind them.\n\nI'd love to show you what ${focus} looks like when it's the whole point of a role, not a side mention.\n\nBest,\n${user.name}`,
    };
  }

  function sendMessage(msg) {
    set({ messages: [...state.messages, msg] });
  }

  function addPeer(handle, fusionLabel) {
    const existing = state.peers.find((p) => p.handle === handle);
    if (existing) return;
    set({ peers: [...state.peers, { handle, fusionLabel, online: true, connection: "none" }] });
  }

  function setPeerConnection(handle, connection) {
    set({ peers: state.peers.map((p) => (p.handle === handle ? { ...p, connection } : p)) });
  }

  function getPreviews(fusion, salt = 0) {
    const f = fusion;
    const baseWeeks = f.roadmap.totalWeeks;
    const variants = [
      {
        title: f.roadmap.title,
        summary: "The flagship path — follow the brief to a shipped, verified artifact.",
        weeks: baseWeeks,
        outcomes: ["Ship one verified artifact from the brief", "Reach your first fusion-score milestone"],
      },
      {
        title: `Become the ${f.a}-minded ${f.b} hire`,
        summary: "Position for roles that want this exact blend on a team.",
        weeks: 4 + ((F.hash(f.a + f.b) + salt) % 4),
        outcomes: ["Build a role-ready portfolio story", "Get real replies in " + f.a + " × " + f.b + " roles"],
      },
      {
        title: `Turn ${f.a} × ${f.b} into a service`,
        summary: "Package the rare pair into an offering you can sell.",
        weeks: 6 + ((F.hash(f.a + "x" + f.b) >> 2) % 3),
        outcomes: ["Package the pair into a sellable offering", "Land your first paying project"],
      },
    ];
    const rot = ((salt % 3) + 3) % 3;
    const ordered = [...variants.slice(rot), ...variants.slice(0, rot)];
    return ordered.map((v, i) => ({
      id: `pv${i}-${salt}`,
      title: v.title,
      summary: v.summary,
      weeks: v.weeks,
      outcomes: v.outcomes || [],
      roadmap: makeRoadmap(f.a, f.b, { title: v.title, totalWeeks: v.weeks, salt: salt + i }),
    }));
  }

  function chooseRoadmap(fusionId, preview) {
    const f = getFusion(fusionId);
    if (!f || !preview) return;
    set({ fusions: state.fusions.map((x) => (x.id === fusionId ? { ...x, roadmap: preview.roadmap } : x)) });
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
  }

  function explainFeedback(a, b, text) {
    const seed = F.hash(a + "×" + b + (text || "").slice(0, 10));
    const clarity = ["Clear", "Tight", "Specific"][seed % 3];
    const notes = [
      `You connected ${a} and ${b} in one line — that's the whole trick.`,
      `Good instinct. Tightening it to one concrete sentence will land harder.`,
      `That reads genuine, which beats polished. One example would seal it.`,
    ];
    const suggestions = [
      `Add one small detail only someone with the ${a} × ${b} blend would know.`,
      `Rewrite it as: "I did X using ${a}, and it changed how we do ${b}."`,
      `End on the outcome — what changed because you shipped it.`,
    ];
    return { clarity, note: notes[seed % 3], suggestion: suggestions[(seed >> 3) % 3] };
  }

  function sendRoomMessage(text) {
    const msg = { id: "rm" + Date.now(), handle: state.user.handle, text: text.trim(), ts: "now", self: true };
    set({ roomMessages: [...state.roomMessages, msg] });
    return msg;
  }

  function peerReplyTo() {
    const pool = state.presence.filter((p) => p.status === "active" || p.status === "idle");
    const peer = pool[Math.floor(Math.random() * pool.length)] || state.presence[0];
    if (!peer) return;
    const replies = [
      "That is exactly the kind of note we trade in here.",
      "Yes — and it changes how the rare-pair people read your work.",
      "Keep going. The seam is where the interesting work is.",
    ];
    const text = replies[F.hash(String(Date.now())) % replies.length];
    set({
      roomMessages: [...state.roomMessages, { id: "rm" + Date.now() + "r", handle: peer.handle, text, ts: "now", self: false }],
    });
  }

  function reportRoomMessage(id) {
    if (state.reportedMessages.includes(id)) return;
    set({ reportedMessages: [...state.reportedMessages, id] });
  }

  function proposeExchange(handle) {
    if (state.exchanges.some((x) => x.handle === handle)) return;
    set({ exchanges: [...state.exchanges, { id: "x" + Date.now(), handle, status: "awaiting-peer" }] });
  }

  function peerConfirmsExchange(handle) {
    set({
      exchanges: state.exchanges.map((x) =>
        x.handle === handle && x.status === "awaiting-peer" ? { ...x, status: "awaiting-you" } : x
      ),
    });
  }

  function finalizeExchange(handle) {
    set({ exchanges: state.exchanges.map((x) => (x.handle === handle ? { ...x, status: "done" } : x)) });
  }

  function reportPeer(handle) {
    set({
      blocked: [...state.blocked, handle],
      peers: state.peers.filter((p) => p.handle !== handle),
      presence: state.presence.filter((p) => p.handle !== handle),
      privatePeer: state.privatePeer && state.privatePeer.handle === handle ? null : state.privatePeer,
      exchanges: state.exchanges.filter((x) => x.handle !== handle),
    });
  }

  return {
    getSnapshot,
    subscribe,
    set,
    useStore,
    updateUser,
    fuse,
    getFusion,
    addSkillToFusion,
    addLog,
    verifyEntry,
    addPost,
    savePost,
    draftPost,
    sendMessage,
    addPeer,
    setPeerConnection,
    getPreviews,
    chooseRoadmap,
    completeWeek,
    explainFeedback,
    sendRoomMessage,
    peerReplyTo,
    reportRoomMessage,
    proposeExchange,
    peerConfirmsExchange,
    finalizeExchange,
    reportPeer,
    syncGithub,
    buildResume,
    SKILL_TAGS,
    COMPETENCIES,
    logTag,
  };
})();
