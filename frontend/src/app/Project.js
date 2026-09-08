const { useState, useEffect } = React;
const { AnimatePresence, motion } = window.Motion;
const { Icons } = window;
const F = window.Fusion;
const Store = window.Store;

const enter = window.MotionKit.enter;

function Project({ id }) {
  const s = Store.useStore();
  const fusion = s.fusions.find((f) => f.id === id);
  const [milestone, setMilestone] = useState(false);

  useEffect(() => {
    if (fusion) window.Ambient.setFusion(fusion.a, fusion.b);
    else window.Ambient.clear();
  }, [fusion?.id]);

  if (!fusion) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center text-center">
        <motion.p {...enter()} className="font-body text-sm text-white/70">
          {"// Project not found"}
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

  const p = fusion.project;

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div
        {...enter()}
        className="liquid-glass-strong relative overflow-hidden rounded-[1.5rem] p-8 md:p-10"
        style={{
          borderTop: `1.5px solid transparent`,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.01), rgba(255,255,255,0.01)), linear-gradient(135deg, ${F.colors(fusion.a, fusion.b)[0]}33, ${F.colors(fusion.a, fusion.b)[1]}33)`,
          backgroundBlendMode: "luminosity",
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <F.FusionChip a={fusion.a} b={fusion.b} size="lg" />
          <span className="rounded-full bg-white px-3 py-1 font-body text-[11px] font-semibold text-black">
            {p.status === "active" ? "In progress" : "Brief"}
          </span>
        </div>
        <h1 className="mt-6 font-heading text-4xl italic leading-[0.95] tracking-[-2px] text-white md:text-5xl">
          {p.title}
        </h1>
        <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            ["Client", p.client],
            ["Timeline", p.timeline],
            ["Format", p.format],
            ["Audience", p.audience],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="font-body text-[10px] uppercase tracking-[0.18em] text-white/50">{k}</p>
              <p className="mt-1.5 font-body text-[13px] font-medium leading-snug text-white/85">{v}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <motion.div {...enter(0.05)} className="liquid-glass rounded-2xl p-6">
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">The goal</p>
          <p className="mt-3 font-body text-sm font-light leading-relaxed text-white/85">{p.goal}</p>
        </motion.div>
        <motion.div {...enter(0.1)} className="liquid-glass rounded-2xl p-6">
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Tools & materials</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.tools.map((t) => (
              <span key={t} className="liquid-glass rounded-full px-3 py-1.5 font-body text-xs font-medium text-white/85">
                {t}
              </span>
            ))}
          </div>
        </motion.div>
        <motion.div {...enter(0.15)} className="liquid-glass rounded-2xl p-6">
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Deliverable</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {p.deliverables.map((d) => (
              <li key={d} className="flex gap-3 font-body text-sm font-light text-white/85">
                <Icons.Check className="mt-0.5 h-4 w-4 shrink-0 text-white/60" />
                {d}
              </li>
            ))}
          </ul>
        </motion.div>
        <motion.div {...enter(0.2)} className="liquid-glass rounded-2xl p-6">
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Expected outcome</p>
          <p className="mt-3 font-body text-sm font-light leading-relaxed text-white/85">{p.expectedOutcome}</p>
        </motion.div>
      </div>

      <motion.div {...enter(0.25)} className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setMilestone((m) => !m)}
          className={
            (milestone ? "bg-white text-black" : "liquid-glass-strong text-white") +
            " tappable flex items-center gap-2 rounded-full px-6 py-3 font-body text-sm font-medium"
          }
        >
          <Icons.Bolt className="h-4 w-4" />
          {milestone ? "Close milestone log" : "Log a milestone"}
        </button>
        <div className="flex gap-4">
          <a href={"#/log"} className="font-body text-sm text-white/60 transition-colors hover:text-white">
            View Growth Log
          </a>
          <a href={"#/posts"} className="font-body text-sm text-white/60 transition-colors hover:text-white">
            Draft a post
          </a>
        </div>
      </motion.div>

      <AnimatePresence>
        {milestone && (
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
              logTitle={`Milestone — ${p.format}`}
              logTags={[
                { label: p.format, kind: "skill", color: F.colorOf(p.format) },
                { label: "Project delivery", kind: "competency", color: null },
              ]}
              placeholder={`What did you ship for this brief?`}
              buttonLabel="Log milestone"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

window.Project = Project;
