const { useState, useEffect } = React;
const { AnimatePresence, motion } = window.Motion;
const { Icons } = window;
const F = window.Fusion;
const Store = window.Store;

const enter = window.MotionKit.enter;

function StatusPill({ status }) {
  if (status === "done")
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-body text-[11px] font-semibold text-black">
        <Icons.Check className="h-3 w-3" />
        Done
      </span>
    );
  if (status === "current")
    return (
      <span
        className="liquid-glass-strong flex items-center gap-2 rounded-full px-3 py-1 font-body text-[11px] font-semibold text-white"
        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.35), 0 0 18px rgba(255,255,255,0.16)" }}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        Current
      </span>
    );
  return (
    <span className="rounded-full border border-white/15 px-3 py-1 font-body text-[11px] font-medium text-white/40">
      Upcoming
    </span>
  );
}

function RoadmapDetail({ id }) {
  const s = Store.useStore();
  const fusion = s.fusions.find((f) => f.id === id);
  const [checked, setChecked] = useState({});
  const [explainWeek, setExplainWeek] = useState(null);
  const [text, setText] = useState("");

  useEffect(() => {
    setExplainWeek(null);
  }, [id]);

  useEffect(() => {
    setChecked({});
    setText("");
    // Deps: id only. Tying this to progressWeeks wiped the roadmapper's
    // checkboxes while they were working toward the current week.
  }, [id]);

  useEffect(() => {
    if (fusion) window.Ambient.setFusion(fusion.a, fusion.b);
    else window.Ambient.clear();
  }, [id]);

  if (!fusion) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center text-center">
        <motion.p {...enter()} className="font-body text-sm text-white/70">
          {"// Roadmap not found"}
        </motion.p>
        <motion.a
          {...enter(0.1)}
          href="#/fuse"
          className="tappable mt-8 flex items-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black"
        >
          Create a fusion
          <Icons.ArrowUpRight className="h-4 w-4" />
        </motion.a>
      </div>
    );
  }

  const { roadmap } = fusion;
  const current = roadmap.weeks.find((w) => w.status === "current");
  const complete = roadmap.progressWeeks > roadmap.totalWeeks;
  const pct = Math.min(100, Math.round((roadmap.progressWeeks / roadmap.totalWeeks) * 100));

  // Creature evolution: completed weeks only (progressWeeks counts the
  // current week as "not yet done"), grade pays the final 30% when >=70.
  const completedWeeks = Math.max(0, Math.min(roadmap.progressWeeks - 1, roadmap.totalWeeks));
  const ev = window.Creature.evolve({
    weeksTotal: roadmap.totalWeeks,
    weeksDone: completedWeeks,
    grade: fusion.grade,
  });

  const currentTasks = current ? current.tasks : [];
  const allDone = current ? currentTasks.every((t) => checked[t.id] === true || t.done === true) : false;

  function toggleTask(id) {
    setChecked((c) => ({ ...c, [id]: !c[id] }));
  }

  function completeWeek() {
    if (!current || !allDone) return;
    Store.completeWeek(fusion.id);
    setExplainWeek(current.n);
    window.Toast.show("Week complete — explain it to lock it in", "success");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div {...enter()}>
        <F.FusionChip a={fusion.a} b={fusion.b} size="lg" />
        <h1 className="mt-5 font-heading text-4xl italic leading-[0.95] tracking-[-2px] text-white md:text-5xl">
          {roadmap.title}
        </h1>
        <p className="mt-3 font-body text-sm font-light text-white/60">
          Week {Math.min(roadmap.progressWeeks, roadmap.totalWeeks)} of {roadmap.totalWeeks} · on track
        </p>
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: pct + "%" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={F.gradStyle(fusion.a, fusion.b)}
          />
        </div>
      </motion.div>

      <ol className="relative mt-12">
        {roadmap.weeks.map((w) => {
          const isCurrent = w.status === "current";
          const isDone = w.status === "done";
          return (
            <li
              key={w.n}
              className="relative border-l border-white/10 pb-8 pl-8 last:pb-0"
              style={isCurrent ? { borderColor: "var(--node-ring)" } : undefined}
            >
              <span
                className="absolute -left-[5px] top-6 h-2.5 w-2.5 rounded-full"
                style={
                  isDone
                    ? { background: "var(--node-done)" }
                    : isCurrent
                      ? { background: "var(--node-active)", boxShadow: "0 0 0 4px var(--node-ring), 0 0 14px var(--node-glow)" }
                      : { background: "var(--node-idle)" }
                }
              />

              <div className={"liquid-glass rounded-2xl p-5 " + (isDone ? "" : "")}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className={"font-heading text-xl italic " + (isDone ? "text-white/40" : isCurrent ? "text-white" : "text-white/40")}>
                      W{w.n}
                    </span>
                    <h3 className={"mt-1 font-heading text-xl italic leading-snug " + (isDone ? "text-white/60" : "text-white")}>
                      {w.title}
                    </h3>
                  </div>
                  <StatusPill status={w.status} />
                </div>

                <ul className="mt-3 flex flex-col gap-1.5">
                  {w.objectives.map((o) => (
                    <li key={o} className="flex gap-2.5 font-body text-[13px] font-light text-white/60">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/50" />
                      {o}
                    </li>
                  ))}
                </ul>

                {isCurrent && currentTasks.length > 0 && (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex flex-col gap-2">
                      {currentTasks.map((t) => {
                        const on = checked[t.id] === true || t.done === true;
                        return (
                          <label
                            key={t.id}
                            className="flex cursor-pointer select-none items-center gap-3 font-body text-sm font-light"
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggleTask(t.id)}
                              className="peer sr-only"
                            />
                            <span
                              className={
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border " +
                                (on ? "border-white bg-white text-black" : "border-white/30 text-transparent")
                              }
                            >
                              <Icons.Check className="h-3.5 w-3.5" />
                            </span>
                            <span className={on ? "text-white/45 line-through" : "text-white/85"}>{t.label}</span>
                          </label>
                        );
                      })}
                    </div>

                    <motion.button
                      type="button"
                      onClick={completeWeek}
                      disabled={!allDone}
                      whileTap={{ scale: 0.97 }}
                      className={
                        (allDone ? "bg-white text-black" : "liquid-glass text-white/50") +
                        " mt-4 flex items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm font-medium disabled:cursor-not-allowed"
                      }
                    >
                      Mark week complete
                      <Icons.Check className="h-4 w-4" />
                    </motion.button>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {explainWeek === w.n && (
                  <motion.div
                    initial={{ opacity: 0, filter: "blur(8px)", y: 14 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    exit={{ opacity: 0, filter: "blur(8px)", y: -8 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <window.ExplainPanel
                      a={fusion.a}
                      b={fusion.b}
                      fusionId={fusion.id}
                      logTitle={`Explained week ${w.n} — ${w.title}`}
                      logTags={[{ label: "Explaining complexity", kind: "competency", color: null }]}
                      placeholder={`How did ${fusion.a} and ${fusion.b} come together this week?`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>

      <AnimatePresence>
        {complete && (
          <motion.div
            initial={{ opacity: 0, filter: "blur(8px)", y: 14 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="liquid-glass-strong mt-4 flex flex-col items-center gap-3 rounded-[1.5rem] p-8 text-center"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
              <Icons.CheckCircle className="h-5 w-5" />
            </span>
            <p className="font-heading text-2xl italic text-white">Roadmap complete</p>
            <p className="max-w-sm font-body text-sm font-light text-white/60">
              You've shipped the {fusion.a} × {fusion.b} blend. The evidence is in your Growth Log.
            </p>
            <a
              href={"#/projects/" + fusion.id}
              className="tappable mt-2 flex items-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black"
            >
              Open the project
              <Icons.ArrowUpRight className="h-4 w-4" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating creature companion — sits on the right edge while the user
          scrolls any week and evolves as weeks complete (fixed, not absolute). */}
      <div className="pointer-events-none fixed bottom-8 right-8 z-40 hidden w-56 xl:block">
        <div className="liquid-glass-strong rounded-[1.5rem] px-5 py-4 text-center">
          <window.Creature.CreatureView a={fusion.a} b={fusion.b} score={{ value: ev.value }} size={110} third={(fusion.addedSkills && fusion.addedSkills[0]) || null} />
          <window.Creature.EvolutionBar a={fusion.a} b={fusion.b} value={ev.value} compact />
          <p className="mt-2 font-body text-[10px] uppercase tracking-[0.18em] text-white/45">
            {ev.value}% evolved · {ev.stage.name}
          </p>
          {!complete && ev.weeksDone < ev.weeksTotal && (
            <p className="mt-1 font-body text-[10px] font-light text-white/30">
              +{Math.round(ev.perWeek * 100) / 100}% per week
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

window.RoadmapDetail = RoadmapDetail;
