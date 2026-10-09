const { useState, useEffect } = React;
const { motion, AnimatePresence } = window.Motion;
const { Icons } = window;
const F = window.Fusion;
const Store = window.Store;

const enter = (delay = 0) => ({
  initial: { filter: "blur(10px)", opacity: 0, y: 22 },
  animate: { filter: "blur(0px)", opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut", delay },
});

const FILTERS = [
  ["all", "All"],
  ["verified", "Verified"],
  ["pending", "Pending"],
  ["self-reported", "Self-reported"],
  ["failed", "Failed"],
];

const CONTRIBUTION_LEVELS = [
  "rgba(255,255,255,0.08)",
  "rgba(255,255,255,0.25)",
  "rgba(255,255,255,0.45)",
  "rgba(255,255,255,0.65)",
  "rgba(255,255,255,0.9)",
];

function levelFor(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

const ACTIVITY_WEEKS = 14;

function buildEmptyWeeks(weeksCount = ACTIVITY_WEEKS) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days = [];
  for (let i = weeksCount * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function buildCombinedWeeks(baseWeeks, entries) {
  if (!baseWeeks) return null;
  const manualCounts = {};
  for (const e of entries) {
    if (e.github || !e.loggedAt) continue;
    const day = e.loggedAt.slice(0, 10);
    manualCounts[day] = (manualCounts[day] || 0) + 1;
  }
  return baseWeeks.map((week) =>
    week.map((d) => ({ date: d.date, count: d.count + (manualCounts[d.date] || 0) }))
  );
}

function ActivityGraph({ weeks }) {
  if (!weeks) {
    return <p className="font-body text-xs font-light text-white/40">Loading activity…</p>;
  }
  return (
    <div
      className="grid w-fit gap-[3px]"
      style={{ gridTemplateRows: "repeat(7, 8px)", gridAutoFlow: "column", gridAutoColumns: "8px" }}
    >
      {weeks.map((week, wi) =>
        week.map((day, di) => (
          <span
            key={wi + "-" + di}
            title={`${day.date}: ${day.count} contribution${day.count === 1 ? "" : "s"}`}
            className="h-2 w-2 rounded-[2px]"
            style={{ background: CONTRIBUTION_LEVELS[levelFor(day.count)] }}
          />
        ))
      )}
    </div>
  );
}

function GrowthLog() {
  const s = Store.useStore();
  const [filter, setFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certLink, setCertLink] = useState("");
  const [sel, setSel] = useState([]);
  const [customSkill, setCustomSkill] = useState("");
  const [customCompetency, setCustomCompetency] = useState("");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    Store.loadGrowthLog().catch(() => {});
    Store.loadGithubContributions().catch(() => {});
  }, []);

  const entries = s.logEntries.filter((e) => (filter === "all" ? true : e.source === filter));
  const stats = [
    { label: "Total entries", value: s.logEntries.length },
    { label: "Verified", value: s.logEntries.filter((e) => e.source === "verified").length },
    { label: "Pending verification", value: s.logEntries.filter((e) => e.source === "pending").length },
  ];
  const baseWeeks = s.user.githubUrl ? s.githubContributions : buildEmptyWeeks();
  const activityWeeks = buildCombinedWeeks(baseWeeks, s.logEntries);

  function toggleTag(t) {
    setSel((xs) => (xs.some((x) => x.label === t.label) ? xs.filter((x) => x.label !== t.label) : [...xs, t]));
  }

  function addCustomTag(kind) {
    const value = kind === "skill" ? customSkill : customCompetency;
    const label = value.trim();
    if (!label) return;
    setSel((xs) =>
      xs.some((x) => x.label === label) ? xs : [...xs, { label, kind, color: kind === "skill" ? F.colorOf(label) : null }]
    );
    if (kind === "skill") setCustomSkill("");
    else setCustomCompetency("");
  }

  async function saveEntry() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const created = await Store.addLog({
        title: title.trim(),
        description: desc,
        tags: sel,
      });

      let finalEntry = created;
      if (certLink.trim()) {
        try {
          finalEntry = await Store.verifyEntry(created.id, certLink.trim(), certIssuer.trim());
        } catch (e) {
          window.Toast.show(e.message || "Logged, but couldn't verify that link", "error");
        }
      }

      setTitle("");
      setDesc("");
      setCertIssuer("");
      setCertLink("");
      setSel([]);
      setAddOpen(false);
      window.Toast.show(
        finalEntry.source === "verified" ? "Logged and verified" : "Logged to your Growth Log",
        "success"
      );
    } catch (e) {
      window.Toast.show(e.message || "Couldn't save that entry", "error");
    } finally {
      setSaving(false);
    }
  }

  async function verify() {
    if (!verifyTarget || !link.trim()) return;
    setVerifying(true);
    try {
      const updated = await Store.verifyEntry(verifyTarget.id, link.trim());
      setVerifyTarget(null);
      setLink("");
      window.Toast.show(
        updated.source === "verified" ? "Evidence verified" : "Couldn't verify that link against your name",
        updated.source === "verified" ? "success" : "error"
      );
    } catch (e) {
      window.Toast.show(e.message || "Couldn't verify that link", "error");
    } finally {
      setVerifying(false);
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      const imported = await Store.syncGithub();
      setSyncOpen(false);
      window.Toast.show(
        imported.length ? `Synced ${imported.length} repos as verified` : "No new repos to sync",
        "success"
      );
    } catch (e) {
      window.Toast.show(e.message || "Couldn't sync GitHub", "error");
    } finally {
      setSyncing(false);
    }
  }

  async function connectGithub() {
    setConnecting(true);
    try {
      const { clientId } = await window.Api.githubOAuthConfig();
      if (!clientId) {
        window.Toast.show("GitHub OAuth isn't configured on the server yet.", "error");
        return;
      }
      const state = (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()).slice(2);
      sessionStorage.setItem("gh_oauth_state", state);
      const redirectUri = window.location.origin + "/";
      const authorizeUrl =
        "https://github.com/login/oauth/authorize?" +
        new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope: "repo", state });
      window.location.href = authorizeUrl;
    } catch (e) {
      window.Toast.show(e.message || "Couldn't start GitHub connect", "error");
      setConnecting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <motion.p {...enter()} className="font-body text-sm text-white/70">
            {"// Evidence ledger"}
          </motion.p>
          <motion.h1
            {...enter(0.08)}
            className="mt-3 font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-6xl"
          >
            Growth Log
          </motion.h1>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setSyncOpen(true)}
            className="liquid-glass-strong flex items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm font-medium text-white"
          >
            <Icons.Refresh className="h-4 w-4" />
            Sync GitHub
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-body text-sm font-medium text-black"
          >
            <Icons.Plus className="h-4 w-4" />
            Log something
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((st, i) => (
          <motion.div key={st.label} {...enter(0.05 * i)} className="liquid-glass rounded-[1.25rem] p-6">
            <p className="font-heading text-4xl italic leading-none text-white">{st.value}</p>
            <p className="mt-2 font-body text-[11px] uppercase tracking-[0.18em] text-white/50">{st.label}</p>
          </motion.div>
        ))}
      </div>

      <motion.div {...enter(0.15)} className="liquid-glass mt-6 rounded-[1.25rem] p-6">
        <p className="font-body text-xs font-light text-white/50">
          {s.user.githubUrl ? "GitHub commits + logged entries" : "Logged entries — connect GitHub to add commits"}
        </p>
        <div className="mt-3 overflow-x-auto">
          <ActivityGraph weeks={activityWeeks} />
        </div>
      </motion.div>

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={
              (filter === key ? "bg-white text-black" : "liquid-glass text-white/85 hover:text-white") +
              " rounded-full px-4 py-2 font-body text-sm font-medium transition-colors"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <p className="mt-16 text-center font-body text-sm font-light text-white/50">
          Nothing here yet — log your first piece of evidence.
        </p>
      ) : (
        <div className="relative mt-10 flex flex-col gap-6">
          <div className="absolute bottom-0 left-[5px] top-0 w-px bg-white/10" />
          {entries.map((e, i) => {
            const fusion = e.fusionId ? s.fusions.find((f) => f.id === e.fusionId) : null;
            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, filter: "blur(8px)", y: 16 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.05 }}
                className="relative pl-8"
              >
                <span className="absolute left-[5px] top-5 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white/40" />
                <div className="liquid-glass rounded-[1.25rem] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      {fusion && <F.FusionChip a={fusion.a} b={fusion.b} size="sm" />}
                      <h3 className="mt-2 font-heading text-xl italic leading-snug text-white">{e.title}</h3>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        {e.isPrivate && (
                          <span className="liquid-glass flex items-center gap-1 rounded-full px-3 py-1 font-body text-[11px] font-medium text-white/70">
                            <Icons.Lock className="h-3 w-3" />
                            Private
                          </span>
                        )}
                        <LogSourceBadge entry={e} />
                      </div>
                      <span className="font-body text-xs font-light text-white/40">{e.date}</span>
                    </div>
                  </div>

                  {e.description && (
                    <p className="mt-2 font-body text-sm font-light leading-relaxed text-white/60">{e.description}</p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-4">
                      {(e.source === "pending" || e.source === "self-reported" || e.source === "failed") && (
                        <button
                          type="button"
                          onClick={() => {
                            setVerifyTarget(e);
                            setLink("");
                          }}
                          className="font-body text-sm text-white/70 transition-colors hover:text-white"
                        >
                          {e.source === "failed" ? "Try a different link" : "Add link"}
                        </button>
                      )}
                      <a href={"#/posts/" + e.id} className="font-body text-sm text-white/70 transition-colors hover:text-white">
                        Draft a post
                      </a>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {e.tags.map((t) => (
                        <SkillTag
                          key={t.label}
                          name={t.label}
                          kind={t.kind === "skill" ? "technical" : "competency"}
                          color={t.color || F.colorOf(t.label)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <window.Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <h3 className="font-heading text-2xl italic text-white">Log something</h3>
        <p className="mt-1 font-body text-xs font-light text-white/60">Add evidence to your growth ledger.</p>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title — e.g. AWS Certified Cloud Practitioner"
          className="mt-4 w-full rounded-xl bg-black/40 px-4 py-3 font-body text-sm text-white outline-none ring-1 ring-white/15 focus:ring-white/40"
        />

        <div className="mt-4">
          <p className="mb-2 font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Technical skills</p>
          <div className="flex flex-wrap gap-2">
            {Store.SKILL_TAGS.map((label) => {
              const on = sel.some((t) => t.label === label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleTag({ label, kind: "skill", color: F.colorOf(label) })}
                  className={
                    (on ? "bg-white text-black" : "liquid-glass text-white/85") +
                    " rounded-full px-3 py-1.5 font-body text-xs font-medium transition-colors"
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomTag("skill");
                }
              }}
              placeholder="Not listed? Add your own…"
              className="flex-1 rounded-full bg-black/40 px-3 py-1.5 font-body text-xs text-white outline-none ring-1 ring-white/15 focus:ring-white/40"
            />
            <button
              type="button"
              onClick={() => addCustomTag("skill")}
              className="liquid-glass shrink-0 rounded-full px-3 py-1.5 font-body text-xs font-medium text-white/85"
            >
              Add
            </button>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Employability competencies</p>
          <div className="flex flex-wrap gap-2">
            {Store.COMPETENCIES.map((label) => {
              const on = sel.some((t) => t.label === label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleTag({ label, kind: "competency", color: null })}
                  className={
                    (on ? "bg-white text-black" : "liquid-glass text-white/85") +
                    " rounded-full px-3 py-1.5 font-body text-xs font-medium transition-colors"
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={customCompetency}
              onChange={(e) => setCustomCompetency(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomTag("competency");
                }
              }}
              placeholder="Not listed? Add your own…"
              className="flex-1 rounded-full bg-black/40 px-3 py-1.5 font-body text-xs text-white outline-none ring-1 ring-white/15 focus:ring-white/40"
            />
            <button
              type="button"
              onClick={() => addCustomTag("competency")}
              className="liquid-glass shrink-0 rounded-full px-3 py-1.5 font-body text-xs font-medium text-white/85"
            >
              Add
            </button>
          </div>
        </div>

        {sel.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Selected</p>
            <div className="flex flex-wrap gap-2">
              {sel.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className="liquid-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs font-medium text-white/85"
                >
                  {t.label}
                  <Icons.X className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          placeholder="What did you do? (optional)"
          className="mt-4 w-full rounded-xl bg-black/40 px-4 py-3 font-body text-sm text-white outline-none ring-1 ring-white/15 focus:ring-white/40"
        />

        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="mb-2 font-body text-[11px] uppercase tracking-[0.18em] text-white/50">
            Certificate or credential (optional)
          </p>
          <p className="mb-3 font-body text-xs font-light text-white/50">
            Got a certificate? Paste its public link and we'll verify it right away — it checks that
            the page resolves and names you.
          </p>
          <input
            value={certIssuer}
            onChange={(e) => setCertIssuer(e.target.value)}
            placeholder="Issuer — e.g. Amazon Web Services"
            className="w-full rounded-xl bg-black/40 px-4 py-3 font-body text-sm text-white outline-none ring-1 ring-white/15 focus:ring-white/40"
          />
          <input
            value={certLink}
            onChange={(e) => setCertLink(e.target.value)}
            placeholder="https://… (verification link)"
            className="mt-2 w-full rounded-xl bg-black/40 px-4 py-3 font-body text-sm text-white outline-none ring-1 ring-white/15 focus:ring-white/40"
          />
        </div>

        <button
          type="button"
          onClick={saveEntry}
          disabled={!title.trim() || saving}
          className={
            (title.trim() && !saving ? "bg-white text-black" : "liquid-glass text-white/30") +
            " mt-4 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 font-body text-sm font-medium"
          }
        >
          {saving ? "Logging…" : "Log it"}
          <Icons.ArrowUpRight className="h-4 w-4" />
        </button>
      </window.Modal>

      <window.Modal open={!!verifyTarget} onClose={() => setVerifyTarget(null)}>
        <h3 className="font-heading text-2xl italic text-white">Verify this evidence</h3>
        <p className="mt-1 font-body text-xs font-light text-white/60">
          Paste a public link that proves it — a credential page, a GitHub commit, a live artifact. We
          check that it resolves and names you.
        </p>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://…"
          className="mt-4 w-full rounded-xl bg-black/40 px-4 py-3 font-body text-sm text-white outline-none ring-1 ring-white/15 focus:ring-white/40"
        />
        <button
          type="button"
          onClick={verify}
          disabled={!link.trim() || verifying}
          className={
            (link.trim() && !verifying ? "bg-white text-black" : "liquid-glass text-white/30") +
            " mt-4 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 font-body text-sm font-medium"
          }
        >
          <Icons.CheckCircle className="h-4 w-4" />
          {verifying ? "Checking…" : "Verify"}
        </button>
      </window.Modal>

      <window.Modal open={syncOpen} onClose={() => setSyncOpen(false)}>
        <h3 className="font-heading text-2xl italic text-white">Sync GitHub</h3>
        <p className="mt-1 font-body text-xs font-light text-white/60">
          We'll pull your repos in as verified evidence, including private ones — GitHub will ask you to
          approve read access to your repositories.
        </p>
        {!s.user.githubConnected ? (
          <button
            type="button"
            onClick={connectGithub}
            disabled={connecting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-body text-sm font-medium text-black disabled:opacity-60"
          >
            <Icons.ArrowUpRight className="h-4 w-4" />
            {connecting ? "Redirecting…" : "Connect GitHub"}
          </button>
        ) : (
          <>
            <p className="mt-4 font-body text-xs text-white/50">
              Connected as <span className="text-white/80">{s.user.githubUrl}</span>
            </p>
            <button
              type="button"
              onClick={sync}
              disabled={syncing}
              className={
                (!syncing ? "bg-white text-black" : "liquid-glass text-white/30") +
                " mt-5 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 font-body text-sm font-medium"
              }
            >
              <Icons.Refresh className="h-4 w-4" />
              {syncing ? "Syncing…" : "Sync now"}
            </button>
          </>
        )}
      </window.Modal>
    </div>
  );
}

window.GrowthLog = GrowthLog;
