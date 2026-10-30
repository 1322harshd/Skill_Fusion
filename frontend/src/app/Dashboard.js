const { useEffect } = React;
const { motion, AnimatePresence } = window.Motion;
const { Icons } = window;
const F = window.Fusion;
const Store = window.Store;

const enter = window.MotionKit.enter;

function MiniSpark({ history }) {
  const pts = history.map((v, i) => [i * 18, 26 - (v / 100) * 22]);
  const line = pts.map((p) => p.join(",")).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox="0 0 90 28" className="h-10 w-full" fill="none">
      <polyline points={line} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="#fff" />
    </svg>
  );
}

function DashBadge({ source }) {
  if (source === "verified") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 font-body text-[10px] font-semibold text-black">
        <Icons.CheckCircle className="h-3 w-3" />
        Verified
      </span>
    );
  }
  if (source === "quiz") {
    return (
      <span className="rounded-full border border-white/25 px-2.5 py-0.5 font-body text-[10px] font-medium text-white/75">
        Quiz
      </span>
    );
  }
  return (
    <span className="rounded-full border border-dashed border-white/40 px-2.5 py-0.5 font-body text-[10px] text-white/70">
      Self
    </span>
  );
}

function FeaturedCard({ fusion }) {
  return (
    <motion.div
      {...enter(0.1)}
      className="liquid-glass-strong relative overflow-hidden rounded-[1.5rem] p-8 md:p-10"
    >
      <div className="absolute inset-0" style={F.tintStyle(fusion.a, fusion.b, 0.14, 140)} />
      <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Featured fusion</p>
          <div className="mt-3">
            <F.FusionChip a={fusion.a} b={fusion.b} size="lg" />
          </div>
          <h2 className="mt-4 max-w-md font-heading text-3xl italic leading-[1.05] tracking-[-1px] text-white md:text-4xl">
            {fusion.roadmap.title}
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={"#/projects/" + fusion.id}
              className="tappable flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-body text-sm font-medium text-black"
            >
              Open project
              <Icons.ArrowUpRight className="h-4 w-4" />
            </a>
            <a
              href={"#/score/" + fusion.id}
              className="tappable liquid-glass flex items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm font-medium text-white transition-colors hover:text-white"
            >
              Fusion score
            </a>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-4 md:items-end">
          <div className="text-right">
            <p className="font-heading text-6xl italic leading-none tracking-[-2px] text-white">{fusion.score.value}</p>
            <p className="mt-1 font-body text-xs font-light text-white/55">
              {fusion.score.rarityLabel} rarity · {fusion.score.demandLabel} demand
            </p>
          </div>
          <div className="w-40">
            <MiniSpark history={fusion.score.history} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function evidenceForFusion(logEntries, fusion) {
  // Entries aren't linked to a fusion by id — match on skill tag overlap
  // with the fusion's two skills instead (entries are already newest-first).
  const skills = new Set([fusion.a, fusion.b]);
  return logEntries.find((e) => e.tags.some((t) => t.kind === "skill" && skills.has(t.label)));
}

const FusionGridCard = React.forwardRef(function FusionGridCard({ fusion, logEntries }, ref) {
  const evidence = evidenceForFusion(logEntries, fusion);
  const rw = fusion.roadmap;
  const frac = Math.min(1, rw.progressWeeks / rw.totalWeeks);
  return (
    <motion.div ref={ref} {...enter(0.05)} className="liquid-glass flex flex-col rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3">
        <F.FusionChip a={fusion.a} b={fusion.b} size="md" />
        <a
          href={"#/score/" + fusion.id}
          className="flex items-center gap-1 font-body text-[11px] font-medium text-white/60 transition-colors hover:text-white"
        >
          {fusion.score.value}
          <Icons.ChartLine className="h-3.5 w-3.5" />
        </a>
      </div>

      <p className="mt-4 font-heading text-lg italic leading-snug text-white">{fusion.roadmap.title}</p>

      <div className="mt-4">
        <div className="flex items-center justify-between font-body text-[10px] font-light text-white/40">
          <span>Week {rw.progressWeeks} of {rw.totalWeeks}</span>
          <span>{Math.round(frac * 100)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${F.colorOf(fusion.a)}, ${F.colorOf(fusion.b)})` }}
            initial={{ width: 0 }}
            animate={{ width: Math.round(frac * 100) + "%" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="font-body text-[10px] uppercase tracking-[0.18em] text-white/40">Latest evidence</p>
        {evidence ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="truncate font-body text-[13px] font-light text-white/75">{evidence.title}</p>
            <LogSourceBadge entry={evidence} />
          </div>
        ) : (
          <p className="mt-2 font-body text-[13px] font-light text-white/45">Nothing logged yet for this fusion.</p>
        )}
      </div>
    </motion.div>
  );
});

function SkillRow({ skill }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-24 shrink-0 font-body text-sm font-medium text-white">{skill.label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-white"
          initial={{ width: 0 }}
          animate={{ width: skill.level * 10 + "%" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="w-7 shrink-0 text-right font-heading text-lg italic text-white/85">{skill.level}</span>
      <div className="w-20 shrink-0 text-right">
        <DashBadge source={skill.levelSource} />
      </div>
    </div>
  );
}

function UpNextCard({ fusion }) {
  const week = fusion.roadmap.weeks.find((w) => w.status === "current") || fusion.roadmap.weeks.find((w) => w.status === "upcoming");
  if (!week) return null;
  const task = (week.tasks && week.tasks[0]) || { label: "Complete the week" };
  return (
    <motion.div {...enter(0.05)} className="liquid-glass-strong flex flex-col gap-4 rounded-2xl p-6">
      <p className="flex items-center gap-2 font-body text-[11px] uppercase tracking-[0.18em] text-white/50">
        <Icons.Activity className="h-4 w-4" />
        Up next
      </p>
      <div>
        <p className="font-heading text-xl italic leading-snug text-white">
          Week {week.n} — {week.title}
        </p>
        <p className="mt-2 font-body text-sm font-light text-white/60">{task.label}</p>
      </div>
      <a
        href={"#/roadmaps/" + fusion.id}
        className="flex items-center gap-2 font-body text-sm font-medium text-white/85 transition-colors hover:text-white"
      >
        Continue the roadmap
        <Icons.ArrowUpRight className="h-4 w-4" />
      </a>
    </motion.div>
  );
}

function Dashboard() {
  const s = Store.useStore();
  // Restoring a fusion after reload is two steps (base record, then its
  // roadmap, fetched separately and asynchronously) — every card below reads
  // fusion.roadmap, so only fusions where that's landed are safe to render.
  const readyFusions = s.fusions.filter((f) => f.roadmap);
  const restoring = s.fusions.length > 0 && readyFusions.length === 0;
  const featured = readyFusions[0];

  // Fusions are otherwise only loaded when the Fuse screen mounts — without
  // this, reloading straight into /dashboard shows the empty state even for
  // a learner who already has fusions.
  useEffect(() => {
    if (s.user.userId) Store.loadFusions().catch(() => {});
  }, [s.user.userId]);

  useEffect(() => {
    if (featured) window.Ambient.setFusion(featured.a, featured.b);
    else window.Ambient.clear();
  }, [featured?.id]);

  const scanEntries = readyFusions.map((f) => ({
    key: f.id,
    a: F.colorOf(f.a),
    b: F.colorOf(f.b),
  }));
  const gridRefs = window.Ambient.useAmbient(scanEntries);
  const topSection = React.useRef(null);

  useEffect(() => {
    if (!topSection.current) return;
    const io = new IntersectionObserver(
      (items) => {
        if (items.some((it) => it.isIntersecting) && featured) {
          window.Ambient.setFusion(featured.a, featured.b);
        }
      },
      { root: null, rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    io.observe(topSection.current);
    return () => io.disconnect();
  }, [featured?.id]);

  if (restoring) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center text-center">
        <motion.p {...enter()} className="font-body text-sm text-white/50">{"// Restoring your fusions…"}</motion.p>
      </div>
    );
  }

  if (!featured) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center text-center">
        <motion.p {...enter()} className="font-body text-sm text-white/70">{"// Nothing here yet"}</motion.p>
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

  return (
    <div className="mx-auto max-w-5xl">
      <section ref={topSection} className="relative overflow-hidden rounded-[1.5rem]">
        <motion.div {...enter()} className="relative p-8 md:p-12">
          <p className="font-body text-sm text-white/70">{"// Today at a glance"}</p>
          <h1 className="mt-3 font-heading text-5xl italic leading-[1.0] tracking-[-3px] text-white md:text-6xl">
            Good {s.user.name ? s.user.name.split(" ")[0] : "there"}
          </h1>
          <p className="mt-4 max-w-xl font-body text-sm font-light leading-relaxed text-white/65">
            You're building <span className="text-white">{featured.a} × {featured.b}</span> — a{" "}
            {featured.score.rarityLabel.toLowerCase()} blend with {featured.score.value} points on the line.
          </p>
        </motion.div>
      </section>

      <FeaturedCard fusion={featured} />

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-heading text-2xl italic text-white">Your fusions</h2>
        <a href="#/fuse" className="flex items-center gap-1.5 font-body text-sm text-white/60 transition-colors hover:text-white">
          <Icons.Plus className="h-4 w-4" />
          Fuse a new pair
        </a>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        {readyFusions.map((f, i) => (
          <FusionGridCard key={f.id} fusion={f} logEntries={s.logEntries} ref={gridRefs[i]} />
        ))}
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="liquid-glass rounded-[1.5rem] p-8 md:p-10">
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Skill profile</p>
          <div className="mt-5 flex flex-col gap-4">
            {s.user.skills.map((sk) => (
              <SkillRow key={sk.label} skill={sk} />
            ))}
          </div>
          <p className="mt-5 font-body text-[11px] font-light text-white/40">
            Verified evidence, quiz baselines, and self-reported levels — all feeding your fusion scores.
          </p>
        </div>
        <UpNextCard fusion={featured} />
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
