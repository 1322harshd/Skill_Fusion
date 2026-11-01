const { useState, useEffect } = React;
const { motion, AnimatePresence } = window.Motion;
const { Icons } = window;
const F = window.Fusion;
const Store = window.Store;
const Creature = window.Creature;

const enter = (delay = 0) => ({
  initial: { filter: "blur(10px)", opacity: 0, y: 22 },
  animate: { filter: "blur(0px)", opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut", delay },
});

function SignalCard({ title, value, frac, explanation }) {
  return (
    <div className="liquid-glass rounded-[1.25rem] p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-xl italic text-white">{title}</h2>
        <span className="font-body text-sm font-medium text-white/85">{value}</span>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #fff, rgba(255,255,255,0.55))" }}
          initial={{ width: 0 }}
          animate={{ width: Math.round(frac * 100) + "%" }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
      <p className="mt-3 font-body text-[13px] font-light leading-relaxed text-white/60">{explanation}</p>
    </div>
  );
}

function Sparkline({ history }) {
  const pts = history.map((v, i) => [i * 18, 26 - (v / 100) * 22]);
  const line = pts.map((p) => p.join(",")).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox="0 0 90 28" className="h-12 w-full" fill="none">
      <polyline points={line} stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="#fff" />
    </svg>
  );
}

// ---- re-fusion (Add third skill -> graduate to the trio) -------------------
// The "Add third skill" flow is gated by the roadmap state (user-approved):
//   scene 1 — mid-roadmap:   warning (progress pauses, history intact)
//   scene 2 — barely started: neutral note (nothing to lose)
//   scene 3 — capped out:    celebration ("Graduate to the trio")
// In every scene, Add = a real re-fusion (new trio fusion, old pair frozen).
function sceneForFusion(fusion) {
  const rm = fusion.roadmap;
  if (!rm) return 2; // no roadmap chosen yet — nothing to lose
  const pw = rm.progressWeeks || 1;
  if (pw > (rm.totalWeeks || rm.weeks.length || 12)) return 3;
  if (pw <= 1) return 2; // chosen but untouched: week 1 merely "current"
  return 1;
}

function AddSkillConfirm({ fusion, skill, scene, busy, onConfirm, onClose }) {
  const rm = fusion.roadmap;
  const title = rm ? (rm.title || "your roadmap") : "no roadmap yet";
  const pw = rm ? rm.progressWeeks || 1 : 0;
  const total = rm ? (rm.totalWeeks || rm.weeks.length) : 0;
  const projectBrief = fusion.project || {};
  const inBriefStage = (projectBrief.status || "brief") !== "active";
  const head = {
    1: "Heads up — mid-roadmap",
    2: fusion.roadmap ? "Fresh start, nothing lost" : "Re-fuse before the first week",
    3: "🎓 Graduate to the trio",
  }[scene];
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={() => !busy && onClose()}
    >
      <motion.div
        {...enter(0)}
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass-strong w-full max-w-lg rounded-[1.5rem] p-7 shadow-2xl"
        role="dialog" aria-modal="true" aria-label="Confirm add third skill"
      >
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/45">
          {head}
        </p>
        <h3 className="mt-2 font-heading text-3xl italic leading-tight text-white">
          Add {skill} to {fusion.a} × {fusion.b}?
        </h3>

        <div className="mt-4 space-y-2.5 font-body text-sm font-light leading-relaxed text-white/75">
          {scene === 1 && (
            <>
              <p>
                You're <span className="text-white">{pw} of {total} weeks in</span>. Adding it
                creates a <span className="text-white">brand-new trio fusion</span> — fresh
                brief, score rechecked, and a new roadmap starting at Week 1.
              </p>
              <p className="text-white/60">
                Your current roadmap pauses where it is ({pw}/{total}) and stays in your
                history, progress intact. Nothing you finished is lost.
              </p>
            </>
          )}
          {scene === 2 && (
            <>
              <p>
                {fusion.roadmap
                  ? "You haven't logged any weeks yet, so there's nothing to lose."
                  : "No roadmap picked yet, so there's nothing to lose."}
              </p>
              <p className="text-white/60">
                Adding {skill} re-fuses the fusion: a fresh trio brief, a rechecked score,
                and a new roadmap starting at Week 1 — you'll pick the path right after.
              </p>
            </>
          )}
          {scene === 3 && (
            <>
              <p>
                You've completed the entire <span className="text-white">{title}</span> roadmap —
                it's capped out. Adding {skill} creates a fresh trio fusion with a premium
                brief, a brand-new roadmap, and a score recheck.
              </p>
              <p className="text-white/60">
                Your {fusion.a} × {fusion.b} project stays open — you can still ship it
                anytime, and the trio ships as its own project.
              </p>
              {inBriefStage && (
                <p className="text-white/55">
                  FYI — the {fusion.a} × {fusion.b} project is still in brief stage; finishing
                  it first is also a perfectly good move.
                </p>
              )}
            </>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button" onClick={onClose} disabled={busy}
            className="rounded-full border border-white/25 px-5 py-2.5 font-body text-sm font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            Leave it
          </button>
          <button
            type="button" onClick={onConfirm} disabled={busy}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-body text-sm font-medium text-black transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/25 border-t-black" />
                Re-fusing…
              </span>
            ) : scene === 3 ? (
              <span className="flex items-center gap-2">
                Graduate to the trio
                <Icons.ArrowUpRight className="h-4 w-4" />
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Add {skill}
                <Icons.ArrowUpRight className="h-4 w-4" />
              </span>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ScoreScreen({ fusionId }) {
  const s = Store.useStore();
  const [selected, setSelected] = useState(fusionId || s.fusions[0]?.id || null);
  const [scoreSource, setScoreSource] = useState(null); // {source, listings} from /api/score/
  // re-fusion modal state lives before any early return (hook order rule)
  const [pendingAdd, setPendingAdd] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const fusion = s.fusions.find((f) => f.id === selected) || s.fusions[0] || null;
  const fusionKey = fusion ? fusion.id : "";

  // Pull the live score for this pair — jobdata when listings exist
  // (rare/demand from real postings), else the labeled heuristic. Trio
  // fusions are deliberately skipped: their score is computed for all three
  // skills at re-fuse time, and a pair-scoped refetch would clobber it.
  useEffect(() => {
    if (!fusionKey) return undefined;
    if (fusion.addedSkills && fusion.addedSkills.length) return undefined;
    let live = true;
    window.Api.fusionScore(fusion.a, fusion.b)
      .then((res) => {
        if (!live || !res || !res.score) return;
        setScoreSource({ source: res.score.source, listings: res.score.listings });
        Store.refreshFusionScore(fusionKey, res.score);
      })
      .catch(() => {}); // keep the fusion's bundled score on failure
    return () => { live = false; };
  }, [fusionKey]);

  if (!fusion) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center text-center">
        <motion.p {...enter()} className="font-body text-sm text-white/70">
          {"// No score yet"}
        </motion.p>
        <motion.a
          {...enter(0.1)}
          href="#/fuse"
          className="mt-8 flex items-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black"
        >
          Create a fusion
          <Icons.ArrowUpRight className="h-4 w-4" />
        </motion.a>
      </div>
    );
  }

  const { score } = fusion;
  const rec = score.recommendation || null;
  const isTrio = fusion.addedSkills.length > 0;
  const trioSkill = fusion.addedSkills[0] || null;
  const lineage = (() => {
    if (!fusion.lineageFrom) return null;
    const old = s.fusions.find((f) => f.id === fusion.lineageFrom);
    return old ? `${old.a} × ${old.b}` : null;
  })();
  const currentValue = score.value;

  function askAdd() {
    setPendingAdd(true);
  }

  async function confirmAdd() {
    setAddBusy(true);
    try {
      await Store.addSkillToFusion(fusion.id, rec.skill);
      window.Toast.show(`${rec.skill} joined — ${fusion.a} × ${fusion.b} × ${rec.skill} is live. Pick its roadmap next.`, "success");
      setPendingAdd(false);
      window.location.hash = "#/roadmaps"; // trio is the newest fusion -> preselected
    } catch (e) {
      window.Toast.show((e && e.message) || "Couldn't re-fuse — try again", "error");
    } finally {
      setAddBusy(false);
      setPendingAdd(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div {...enter()} className="text-center">
        {Creature ? (
          <div className="mb-6 flex justify-center" key={fusionKey}>
            <Creature.CreatureView a={fusion.a} b={fusion.b} score={score} size={148} caption third={trioSkill} lineage={lineage} />
          </div>
        ) : null}
        <F.FusionChip a={fusion.a} b={fusion.b} size="lg" third={trioSkill} />
        <h1 className="mt-5 font-heading text-4xl italic leading-[0.95] tracking-[-2px] text-white md:text-5xl">
          Fusion Score
        </h1>
        {s.fusions.length > 1 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {s.fusions.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelected(f.id)}
                className={
                  (f.id === fusion.id ? "bg-white text-black" : "liquid-glass text-white/85 hover:text-white") +
                  " rounded-full px-4 py-2 font-body text-sm font-medium transition-colors"
                }
              >
                {f.a} × {f.b}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      <div className="mt-10 flex justify-center">
        <motion.div {...enter(0.05)} className="flex flex-col items-center">
          <FusionGauge value={currentValue} a={fusion.a} b={fusion.b} size={200} label="score" />
          <p className="mt-4 flex items-center gap-2 font-body text-[13px] font-medium text-white/85">
            weights: rarity 45% · demand 55%
            <span title="Rarity = how few listings use this pair (supply). Demand = growth & volume of postings wanting it. Score = weighted blend — higher = more defensible niche." className="flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-white/20 text-[11px] text-white/70">
              ?
            </span>
          </p>
          {scoreSource && (
            <p role="status" className="mt-2 font-body text-[11px] font-light text-white/45">
              {scoreSource.source === "jobdata"
                ? `computed live from ${scoreSource.listings} real job listings`
                : "estimate — live job data will refine this pair"}
            </p>
          )}
          <p className="mt-1 max-w-sm text-center font-body text-xs font-light leading-relaxed text-white/55">
            Top 15% is Exceptional · higher = more defensible
          </p>
        </motion.div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        <motion.div {...enter(0.1)}>
          <SignalCard
            title="Uniqueness Rating"
            value={score.rarityLabel}
            frac={score.rarity}
            explanation={score.explanation[0]}
          />
        </motion.div>
        <motion.div {...enter(0.15)}>
          <SignalCard
            title="Market Demand"
            value={score.demandLabel}
            frac={score.demand}
            explanation={score.explanation[1]}
          />
        </motion.div>
      </div>

      <motion.div {...enter(0.18)} className="liquid-glass mt-4 rounded-[1.25rem] p-6">
        <p className="font-body text-[13px] font-light leading-relaxed text-white/75">{score.explanation[2]}</p>
      </motion.div>

      <motion.div
        {...enter(0.2)}
        className="liquid-glass-strong mt-10 flex flex-col items-center gap-5 rounded-[1.5rem] p-8 text-center md:flex-row md:justify-between md:text-left"
      >
        <div>
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">
            {isTrio ? "Trio fusion" : "Recommended third skill"}
          </p>
          <p className="mt-2 font-heading text-2xl italic leading-snug text-white">
            {isTrio ? (
              <>
                {trioSkill} completes the {fusion.a} × {fusion.b} trio — score rechecked as a team, not a pair
              </>
            ) : (
              <>
                Add {rec.skill} to lift your score to <span className="text-white/90">{currentValue + rec.delta}</span>
              </>
            )}
          </p>
        </div>
        {!isTrio && rec ? (
          <motion.button
            type="button"
            onClick={askAdd}
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            className="flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black"
          >
            Add {rec.skill}
            <span className="rounded-full bg-black px-2 py-0.5 text-[11px] font-semibold text-white">+{rec.delta}</span>
          </motion.button>
        ) : isTrio ? (
          <span className="flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black">
            <Icons.Check className="h-4 w-4" />
            Trio complete
          </span>
        ) : null}
      </motion.div>

      <motion.div {...enter(0.25)} className="liquid-glass mt-10 rounded-[1.5rem] p-6">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Score history</p>
        {score.history.length <= 1 ? (
          <p className="mt-4 font-body text-sm font-light text-white/60">Log more evidence to see trend — history builds from real activity.</p>
        ) : (
          <>
            <div className="mt-4">
              <Sparkline history={score.history} />
            </div>
            <div className="mt-2 flex justify-between font-body text-[11px] font-light text-white/40">
              <span>6 weeks ago</span>
              <span>today</span>
            </div>
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {pendingAdd && rec && (
          <AddSkillConfirm
            fusion={fusion}
            skill={rec.skill}
            scene={sceneForFusion(fusion)}
            busy={addBusy}
            onConfirm={confirmAdd}
            onClose={() => setPendingAdd(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

window.ScoreScreen = ScoreScreen;
