const { useState, useEffect } = React;
const { AnimatePresence, motion } = window.Motion;
const { Icons } = window;
const F = window.Fusion;
const Store = window.Store;
const { AiSteps } = window;

const FUSE_LOADING_STEPS = [
  { label: "Mapping the overlap", foot: "Finding where the two skills actually meet." },
  { label: "Sampling job listings", foot: "Pulling live postings that want this blend." },
  { label: "Checking rarity", foot: "Measuring how often the pair appears together." },
  { label: "Drafting your story", foot: "Writing your personalized fusion brief." },
];

const enter = window.MotionKit.enter;

function Fuse() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [phase, setPhase] = useState("input");
  const [fusion, setFusion] = useState(null);

  const ready = a.trim().length > 0 && b.trim().length > 0;

  useEffect(() => {
    if (phase === "result" && fusion) window.Ambient.setFusion(fusion.a, fusion.b);
    else if (ready) window.Ambient.setFusion(a.trim(), b.trim());
    else window.Ambient.clear();
  }, [a, b, phase]);

  function fuse() {
    if (!ready) return;
    const f = Store.fuse(a.trim(), b.trim());
    setFusion(f);
    setPhase("loading");
  }

  function reset() {
    setA("");
    setB("");
    setFusion(null);
    setPhase("input");
  }

  return (
    <section className="relative min-h-[80vh] overflow-hidden">
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <motion.h1
            {...enter(0.08)}
            className="mt-3 font-heading text-5xl italic leading-[1.0] tracking-[-3px] text-white md:text-6xl"
          >
            Fuse any two skills
          </motion.h1>
        </div>

        <AnimatePresence mode="wait">
          {phase === "input" && (
            <motion.div key="input" {...enter(0.12)}>
              <div className="flex flex-col items-center gap-4">
                <window.SkillPicker
                  mode="single"
                  label="Skill one"
                  value={a}
                  onChange={setA}
                  placeholder="Pick a skill from any domain"
                  className="max-w-lg"
                />
                <F.FusionOrb a={a} b={b} className="h-16 w-16 text-2xl">
                  ×
                </F.FusionOrb>
                <window.SkillPicker
                  mode="single"
                  label="Skill two"
                  value={b}
                  onChange={setB}
                  placeholder="Pick another skill from any domain"
                  className="max-w-lg"
                />
              </div>

              <div className="mt-10 flex justify-center">
                <motion.button
                  type="button"
                  onClick={fuse}
                  disabled={!ready}
                  whileTap={{ scale: 0.97 }}
                  className={
                    (ready ? "bg-white text-black" : "liquid-glass text-white/50") +
                    " flex items-center gap-2 rounded-full px-8 py-3.5 font-body text-sm font-medium disabled:cursor-not-allowed"
                  }
                >
                  Fuse {a && b ? `${a} × ${b}` : "two skills"}
                  <Icons.Bolt className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === "loading" && (
            <motion.div key="loading" {...enter(0.05)}>
              <div className="liquid-glass-strong rounded-[1.5rem]">
                <div className="border-b border-white/10 px-8 py-8 text-center md:px-10">
                  <p className="font-heading text-2xl italic text-white">
                    Reading the {a} × {b} overlap
                  </p>
                </div>
                <AiSteps
                  steps={FUSE_LOADING_STEPS}
                  speed={1250}
                  onDone={() => setPhase("result")}
                />
              </div>
            </motion.div>
          )}

          {phase === "result" && fusion && (
            <motion.div key="result" {...enter(0.05)}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">
                    Your fusion
                  </p>
                  <p className="mt-2 font-heading text-4xl italic tracking-[-2px] text-white md:text-5xl">
                    {fusion.a} <span className="text-white/40">×</span> {fusion.b}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-6xl italic leading-none tracking-[-2px] text-white">
                    {fusion.score.value}
                  </p>
                  <p className="mt-1 font-body text-xs font-light text-white/60">
                    {fusion.score.rarityLabel} rarity · {fusion.score.demandLabel} demand
                  </p>
                </div>
              </div>

              <p className="mt-8 max-w-2xl font-body text-sm font-light leading-relaxed text-white/80">
                {fusion.brief.lede}
              </p>

              <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="liquid-glass rounded-2xl p-6">
                  <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Complementarity</p>
                  <ul className="mt-3 flex flex-col gap-3">
                    {fusion.brief.complementarity.map((line) => (
                      <li key={line} className="flex gap-3 font-body text-sm font-light text-white/85">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white/60" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="liquid-glass rounded-2xl p-6">
                  <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Where it shows up</p>
                  <ul className="mt-3 flex flex-col gap-3">
                    {fusion.brief.applications.map((line) => (
                      <li key={line} className="flex gap-3 font-body text-sm font-light text-white/85">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white/60" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="liquid-glass rounded-2xl p-6">
                  <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Industries</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {fusion.brief.industries.map((ind) => (
                      <span key={ind} className="liquid-glass rounded-full px-3 py-1.5 font-body text-xs font-medium text-white/85">
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="liquid-glass rounded-2xl p-6">
                  <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Insights</p>
                  <ul className="mt-3 flex flex-col gap-3">
                    {fusion.brief.insights.map((line) => (
                      <li key={line} className="flex gap-3 font-body text-sm font-light text-white/85">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white/60" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <a
                  href={"#/roadmaps"}
                  className="tappable flex items-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black"
                >
                  Choose a roadmap
                  <Icons.ArrowUpRight className="h-4 w-4" />
                </a>
                <a
                  href={"#/score/" + fusion.id}
                  className="liquid-glass-strong flex items-center gap-2 rounded-full px-6 py-3 font-body text-sm font-medium text-white"
                >
                  See the score
                  <Icons.ChartLine className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={reset}
                  className="tappable flex items-center gap-2 rounded-full px-5 py-3 font-body text-sm text-white/70 transition-colors hover:text-white"
                >
                  Fuse a new pair
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

window.Fuse = Fuse;
