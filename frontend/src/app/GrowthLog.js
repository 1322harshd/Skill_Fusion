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
  ["self", "Self-reported"],
];

function LogSourceBadge({ entry }) {
  if (entry.source === "verified") return <VerifiedBadge verified label="Verified" />;
  if (entry.source === "self-reported") return <VerifiedBadge verified={false} label="Self-reported" />;
  const v = entry.verification || {};
  const frac = v.ringFrac ?? 0.7;
  const days = v.expiresInDays ?? 3;
  return (
    <span className="liquid-glass flex items-center gap-2 rounded-full px-3 py-1 font-body text-[11px] font-medium text-white/85">
      <CountdownRing frac={frac} color="#ffffff" size={18} strokeWidth={2.5} />
      {days <= 1 ? "1 day left" : `Verifying in ${days} days`}
    </span>
  );
}

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

function GithubGraph({ weeks }) {
  if (!weeks) {
    return <p className="font-body text-xs font-light text-white/40">Loading GitHub activity…</p>;
  }
  if (!weeks.length) {
    return <p className="font-body text-xs font-light text-white/40">No GitHub activity found yet.</p>;
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
  const [desc, setDesc] = useState("");
  const [sel, setSel] = useState([]);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [githubUrlInput, setGithubUrlInput] = useState(s.user.githubUrl || "");

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

  function toggleTag(t) {
    setSel((xs) => (xs.some((x) => x.label === t.label) ? xs.filter((x) => x.label !== t.label) : [...xs, t]));
  }

  async function saveEntry() {
    const first = sel[0];
    setSaving(true);
    try {
      await Store.addLog({
        title: first ? `Logged — ${first.label}` : "Logged a note",
        description: desc,
        tags: sel,
      });
      setDesc("");
      setSel([]);
      setAddOpen(false);
      window.Toast.show("Logged to your Growth Log", "success");
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
      const url = githubUrlInput.trim();
      if (url && url !== s.user.githubUrl) {
        await window.Api.updateMe({ githubUrl: url });
        Store.updateUser({ githubUrl: url });
      }
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
                      <LogSourceBadge entry={e} />
                      <span className="font-body text-xs font-light text-white/40">{e.date}</span>
                    </div>
                  </div>

                  {e.description && (
                    <p className="mt-2 font-body text-sm font-light leading-relaxed text-white/60">{e.description}</p>
                  )}

                  {e.github && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <GithubGraph weeks={s.githubContributions} />
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-4">
                      {(e.source === "pending" || e.source === "self-reported") && (
                        <button
                          type="button"
                          onClick={() => {
                            setVerifyTarget(e);
                            setLink("");
                          }}
                          className="font-body text-sm text-white/70 transition-colors hover:text-white"
                        >
                          Add link
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
        </div>

        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          placeholder="What did you do?"
          className="mt-4 w-full rounded-xl bg-black/40 px-4 py-3 font-body text-sm text-white outline-none ring-1 ring-white/15 focus:ring-white/40"
        />

        <button
          type="button"
          onClick={saveEntry}
          disabled={!desc.trim() || saving}
          className={
            (desc.trim() && !saving ? "bg-white text-black" : "liquid-glass text-white/30") +
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
          We'll pull your public repos in as verified evidence.
        </p>
        {!s.user.githubUrl && (
          <input
            value={githubUrlInput}
            onChange={(e) => setGithubUrlInput(e.target.value)}
            placeholder="https://github.com/yourhandle"
            className="mt-4 w-full rounded-xl bg-black/40 px-4 py-3 font-body text-sm text-white outline-none ring-1 ring-white/15 focus:ring-white/40"
          />
        )}
        <button
          type="button"
          onClick={sync}
          disabled={syncing || (!s.user.githubUrl && !githubUrlInput.trim())}
          className={
            (!syncing && (s.user.githubUrl || githubUrlInput.trim()) ? "bg-white text-black" : "liquid-glass text-white/30") +
            " mt-5 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 font-body text-sm font-medium"
          }
        >
          <Icons.Refresh className="h-4 w-4" />
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </window.Modal>
    </div>
  );
}

window.GrowthLog = GrowthLog;
