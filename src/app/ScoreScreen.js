const { useState } = React;
const { motion, AnimatePresence } = window.Motion;
const { Icons } = window;
const F = window.Fusion;
const Store = window.Store;

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

function ScoreScreen({ fusionId }) {
  const s = Store.useStore();
  const [selected, setSelected] = useState(fusionId || s.fusions[0]?.id || null);
  const fusion = s.fusions.find((f) => f.id === selected) || s.fusions[0] || null;

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
  const rec = score.recommendation;
  const added = fusion.addedSkills.includes(rec.skill);
  const currentValue = score.value;

  function addSkill() {
    Store.addSkillToFusion(fusion.id, rec.skill);
    window.Toast.show(`${rec.skill} added — your score moved`, "success");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div {...enter()} className="text-center">
        <F.FusionChip a={fusion.a} b={fusion.b} size="lg" />
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
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Recommended third skill</p>
          <p className="mt-2 font-heading text-2xl italic leading-snug text-white">
            {added ? (
              <>
                {rec.skill} is now part of your {fusion.a} × {fusion.b}
              </>
            ) : (
              <>
                Add {rec.skill} to lift your score to <span className="text-white/90">{currentValue + rec.delta}</span>
              </>
            )}
          </p>
        </div>
        {!added ? (
          <motion.button
            type="button"
            onClick={addSkill}
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            className="flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black"
          >
            Add {rec.skill}
            <span className="rounded-full bg-black px-2 py-0.5 text-[11px] font-semibold text-white">+{rec.delta}</span>
          </motion.button>
        ) : (
          <span className="flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black">
            <Icons.Check className="h-4 w-4" />
            Added
          </span>
        )}
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
    </div>
  );
}

window.ScoreScreen = ScoreScreen;
