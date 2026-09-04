const { useState, useEffect } = React;
const { AnimatePresence, motion } = window.Motion;
const { Icons, BlurText } = window;
const F = window.Fusion;
const Store = window.Store;

const enter = (delay = 0) => ({
  initial: { filter: "blur(10px)", opacity: 0, y: 22 },
  animate: { filter: "blur(0px)", opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut", delay },
});

function ForestTopView({ a, b }) {
  const grad = F.gradStyle(a, b);
  // Wavy sand path with dense forest — top view
  const wavyD = "M12 48 C 52 30, 88 66, 132 46 S 180 32, 230 50 S 288 62, 340 38 S 388 48, 388 48";
  return (
    <div className="relative overflow-hidden rounded-xl liquid-glass" style={{ height: 112 }}>
      <div className="absolute inset-x-0 top-0 h-px" style={grad} />
      <div className="absolute inset-0 bg-white/[0.015]" />
      <svg viewBox="0 0 400 112" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <radialGradient id="snowGrad2" cx="50%" cy="36%" r="70%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.99)" />
            <stop offset="52%" stopColor="rgba(255,255,255,0.92)" />
            <stop offset="84%" stopColor="rgba(236,242,255,0.90)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.84)" />
          </radialGradient>
          <filter id="treeShadow2" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="rgba(0,0,0,0.48)" floodOpacity="0.55" />
          </filter>
          <marker id="arrowHeadWhite" markerWidth="14" markerHeight="14" refX="11" refY="7" orient="auto" markerUnits="strokeWidth">
            <path d="M0 0 L14 7 L0 14 Z" fill="white" />
          </marker>
        </defs>
        {/* Dense forest — organic fluffy pines, not stars */}
        {[
          [26,15,1.05],[58,12,0.92],[92,17,1.0],[132,13,0.88],[168,16,0.98],[206,11,0.86],[248,14,1.04],[286,12,0.9],[324,16,0.96],[362,13,0.9],[384,18,0.82],
          [34,90,0.98],[70,93,0.88],[108,89,1.02],[146,92,0.86],[184,87,1.08],[220,91,0.9],[262,88,0.96],[302,92,0.87],[346,90,0.99],[20,76,0.82],[376,78,0.88],
        ].map(([x,y,sc], idx) => (
          <g key={idx} filter="url(#treeShadow2)" opacity="0.98" transform={`translate(${x},${y}) scale(${sc})`}>
            {/* shadow */}
            <ellipse cx="0.8" cy="3.2" rx="9" ry="4.2" fill="rgba(0,0,0,0.28)" opacity="0.32" />
            {/* foliage — overlapping soft blobs, not star */}
            <circle r="11.5" fill="#0f2e1e" stroke="rgba(255,255,255,0.07)" strokeWidth="0.7" />
            <circle cx="4.2" cy="-2.8" r="6.8" fill="#1a3a25" opacity="0.88" />
            <circle cx="-4.6" cy="3.2" r="7.2" fill="#0e2418" opacity="0.58" />
            <circle cx="1.8" cy="3.8" r="5.2" fill="#143524" opacity="0.72" />
            <circle cx="-2.2" cy="-4.1" r="4.6" fill="#1e4a2d" opacity="0.55" />
            {/* snow cap — organic, soft */}
            <ellipse cx="0.4" cy="-0.6" rx="6.6" ry="5.4" fill="url(#snowGrad2)" />
            <ellipse cx="-0.9" cy="-1.8" rx="2.6" ry="1.7" fill="white" opacity="0.94" />
            <circle cx="0.6" cy="0.3" r="1.05" fill="white" opacity="0.82" />
          </g>
        ))}
        {/* Wavy sand path — less faded transparent */}
        <path d={wavyD} fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <path d={wavyD} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.9" strokeDasharray="2 7" opacity="0.22" />
        {/* base road faded */}
        <path d={wavyD} fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {/* Wavy white arrow — same wavy D, covers whole path with tail as it moves */}
      <svg viewBox="0 0 400 112" className="absolute inset-0 h-full w-full pointer-events-none" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <filter id="arrowShadow2" x="-20%" y="-50%" width="140%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3.5" floodColor="white" floodOpacity="0.42" />
          </filter>
        </defs>
        <motion.path
          d={wavyD}
          fill="none"
          stroke="white"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd="url(#arrowHeadWhite)"
          filter="url(#arrowShadow2)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0,1,1,0], opacity: [0,1,1,0] }}
          transition={{ duration: 4.6, times: [0,0.48,0.72,1], ease: ["easeOut","linear","easeIn"], repeat: Infinity, repeatDelay: 1.1 }}
          style={{ pathLength: 1 }}
        />
        {/* arrow tail thick cover — same wavy but with tail width */}
        <motion.path
          d={wavyD}
          fill="none"
          stroke="white"
          strokeWidth="22"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.14"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0,1,1,0] }}
          transition={{ duration: 4.6, times: [0,0.48,0.72,1], ease: ["easeOut","linear","easeIn"], repeat: Infinity, repeatDelay: 1.1 }}
        />
      </svg>
    </div>
  );
}

function MiniWeeks({ weeks, total }) {
  return (
    <div className="mt-4">
      <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Preview — {weeks.length} of {total} weeks</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {weeks.map((w) => {
          const isCurrent = w.n === 1;
          return (
            <div key={w.n} className="liquid-glass rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="font-heading text-sm italic text-white/40">W{w.n}</span>
                <span className={"rounded-full px-2 py-0.5 font-body text-[10px] font-semibold " + (isCurrent ? "bg-white text-black" : "border border-white/15 text-white/40")}>
                  {isCurrent ? "Current" : "Upcoming"}
                </span>
              </div>
              <p className="mt-2 font-heading text-sm italic leading-snug text-white">{w.title}</p>
              <p className="mt-1.5 line-clamp-2 font-body text-[11px] font-light leading-relaxed text-white/55">{w.objectives[0]}</p>
            </div>
          );
        })}
      </div>
      {total > weeks.length && (
        <p className="mt-2 text-center font-body text-[11px] font-light text-white/30">+{total - weeks.length} more after start</p>
      )}
    </div>
  );
}

function Roadmaps() {
  const s = Store.useStore();
  const [fusionId, setFusionId] = useState(s.fusions[0]?.id || null);
  const [salt, setSalt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fusion = s.fusions.find((f) => f.id === fusionId) || s.fusions[0] || null;
  const selected = previews.find((p) => p.id === selectedId) || null;

  useEffect(() => {
    if (fusion) setPreviews(Store.getPreviews(fusion, salt));
  }, [fusionId, salt]);

  useEffect(() => {
    function onKey(e){ if(e.key==="Escape") setExpandedId(null); }
    window.addEventListener("keydown", onKey);
    return ()=> window.removeEventListener("keydown", onKey);
  }, []);

  if (!fusion) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center text-center">
        <motion.p {...enter()} className="font-body text-sm text-white/70">
          {"// No roadmaps yet"}
        </motion.p>
        <motion.h1 {...enter(0.08)} className="mt-4 font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-6xl">Fuse two skills first</motion.h1>
        <motion.a {...enter(0.18)} href="#/fuse" className="mt-8 flex items-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black">Create a fusion<Icons.ArrowUpRight className="h-4 w-4" /></motion.a>
      </div>
    );
  }

  function handleCardClick(pv){
    console.log("[Roadmaps] click", pv.id, "expanded", expandedId);
    setSelectedId(pv.id);
    setExpandedId(prev => prev === pv.id ? null : pv.id);
  }

  function handlePreviewToggle(e, pv){
    e.stopPropagation();
    setExpandedId(prev => prev === pv.id ? null : pv.id);
    if (selectedId !== pv.id) setSelectedId(pv.id);
  }

  function choose(pv) {
    Store.chooseRoadmap(fusion.id, pv);
    window.Router.go("/roadmaps/" + fusion.id);
  }

  function regenerate() {
    if (busy) return;
    setBusy(true);
    setTimeout(() => { setSalt((x) => x + 1); setSelectedId(null); setExpandedId(null); setBusy(false); }, 900);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-10">
        <motion.p {...enter()} className="font-body text-sm text-white/70">{"// Choose a path"}</motion.p>
        <BlurText text="Choose Your Path" delay={0.05} className="mt-3 font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-6xl" />
        {s.fusions.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {s.fusions.map((f) => (
              <button key={f.id} type="button" onClick={() => { setFusionId(f.id); setSelectedId(null); setExpandedId(null); }} className={(f.id === fusion.id ? "bg-white text-black" : "liquid-glass text-white/85 hover:text-white") + " rounded-full px-4 py-2 font-body text-sm font-medium transition-colors"}>{f.a} × {f.b}</button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {busy ? (
          <motion.div key="busy" {...enter()} className="liquid-glass flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-[1.5rem]">
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20"><Icons.Refresh className="h-4 w-4 text-white/80" /></motion.span>
            <p className="font-heading text-2xl italic text-white">Re-thinking…</p>
          </motion.div>
        ) : expandedId ? (
          (() => {
            const expandedPv = previews.find(p=>p.id===expandedId) || previews[0];
            const expandedIdx = previews.findIndex(p=>p.id===expandedId);
            const previewWeeks = (expandedPv.roadmap?.weeks || []).slice(0, Math.min(4, expandedPv.weeks));
            const leftDoors = previews.filter((_, idx)=> idx < expandedIdx);
            const rightDoors = previews.filter((_, idx)=> idx > expandedIdx);
            function DoorCard({pv, idx}){
              const doorIdx = previews.findIndex(p=>p.id===pv.id);
              return (
                <button key={pv.id} type="button" onClick={()=> { setSelectedId(pv.id); setExpandedId(pv.id); }} className="liquid-glass w-full text-left rounded-2xl p-4 hover:ring-1 hover:ring-white/20 transition-all opacity-80 hover:opacity-100">
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-sm italic text-white/30">{String(doorIdx+1).padStart(2,"0")}</span>
                    <span className="rounded-full px-2.5 py-0.5 font-body text-[10px] font-semibold text-black" style={F.gradStyle(fusion.a, fusion.b)}>{pv.weeks} wks</span>
                  </div>
                  <p className="mt-3 font-heading text-base italic leading-tight text-white line-clamp-2">{pv.title}</p>
                  <p className="mt-1.5 line-clamp-2 font-body text-xs font-light text-white/55">{pv.summary}</p>
                </button>
              );
            }
            return (
              <motion.div key="expanded" initial={{ opacity: 0, filter: "blur(8px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0, filter: "blur(8px)" }} transition={{ duration: 0.4 }} className="relative overflow-hidden">
                {/* sliding doors backdrop */}
                <div className="flex gap-4 items-stretch">
                  {/* left doors */}
                  <AnimatePresence mode="wait">
                    <motion.div key={"left-"+expandedId} initial={{ x: -80, opacity: 0, filter: "blur(6px)" }} animate={{ x: 0, opacity: 1, filter: "blur(0px)" }} exit={{ x: -80, opacity: 0, filter: "blur(6px)" }} transition={{ duration: 0.35, ease: "easeOut" }} className="hidden md:flex w-[22%] flex-col gap-3 shrink-0">
                      {leftDoors.length ? leftDoors.map((pv)=> <DoorCard key={pv.id} pv={pv} />) : <div className="flex-1 rounded-2xl border border-dashed border-white/10 flex items-center justify-center p-4"><span className="font-body text-xs text-white/20">—</span></div>}
                    </motion.div>
                  </AnimatePresence>
                  {/* center expanded - full preview with same open/close animation on switch */}
                  <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                      <motion.div key={expandedId} initial={{ opacity: 0, filter: "blur(8px)", y: 12 }} animate={{ opacity: 1, filter: "blur(0px)", y: 0 }} exit={{ opacity: 0, filter: "blur(8px)", y: -12 }} transition={{ duration: 0.35, ease: "easeOut" }} className="liquid-glass rounded-[1.5rem] p-6 md:p-7">
                        <div className="flex items-center justify-between">
                          <span className="font-heading text-xl italic text-white/40">{String(expandedIdx+1).padStart(2,"0")}</span>
                          <div className="flex items-center gap-2">
                            {expandedIdx===1 && <span className="rounded-full bg-white px-3 py-1 font-body text-[10px] font-semibold text-black">Most Popular</span>}
                            <span className="rounded-full px-3 py-1 font-body text-[11px] font-semibold text-black" style={F.gradStyle(fusion.a, fusion.b)}>{expandedPv.weeks} wks</span>
                            <button type="button" onClick={()=> setExpandedId(null)} className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white hover:text-black transition-colors"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </div>
                        </div>
                        <h3 className="mt-6 font-heading text-3xl italic leading-[1.0] tracking-[-1px] text-white">{expandedPv.title}</h3>
                        <p className="mt-3 font-body text-sm font-light leading-relaxed text-white/65">{expandedPv.summary}</p>
                        <ul className="mt-4 flex flex-col gap-2">
                          {(expandedPv.outcomes||[]).slice(0,2).map(o=> <li key={o} className="flex gap-2.5 font-body text-[13px] font-light text-white/75"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/50" />{o}</li>)}
                        </ul>
                        <div className="mt-6">
                          <ForestTopView a={fusion.a} b={fusion.b} />
                        </div>
                        <MiniWeeks weeks={previewWeeks} total={expandedPv.weeks} />
                        <div className="mt-6 flex gap-3">
                          <button type="button" onClick={()=> choose(expandedPv)} className="flex-1 flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black"><Icons.ArrowUpRight className="h-4 w-4" />Start this roadmap</button>
                          <button type="button" onClick={()=> setExpandedId(null)} className="rounded-full bg-white/10 px-6 py-3 font-body text-sm text-white/70 hover:bg-white/15 hover:text-white">Close</button>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  {/* right doors */}
                  <AnimatePresence mode="wait">
                    <motion.div key={"right-"+expandedId} initial={{ x: 80, opacity: 0, filter: "blur(6px)" }} animate={{ x: 0, opacity: 1, filter: "blur(0px)" }} exit={{ x: 80, opacity: 0, filter: "blur(6px)" }} transition={{ duration: 0.35, ease: "easeOut" }} className="hidden md:flex w-[22%] flex-col gap-3 shrink-0">
                      {rightDoors.length ? rightDoors.map((pv)=> <DoorCard key={pv.id} pv={pv} />) : <div className="flex-1 rounded-2xl border border-dashed border-white/10 flex items-center justify-center p-4"><span className="font-body text-xs text-white/20">—</span></div>}
                    </motion.div>
                  </AnimatePresence>
                </div>
                {/* mobile: doors as horizontal scroll below */}
                <div className="mt-4 flex gap-3 md:hidden overflow-x-auto pb-2">
                  {previews.filter(p=>p.id!==expandedId).map(pv=> (
                    <button key={pv.id} type="button" onClick={()=> { setSelectedId(pv.id); setExpandedId(pv.id); }} className="liquid-glass shrink-0 w-[68%] text-left rounded-2xl p-4">
                      <p className="font-heading text-base italic text-white line-clamp-1">{pv.title}</p>
                      <p className="mt-1 font-body text-xs text-white/50">{pv.weeks} wks</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })()
        ) : (
          <div key={"cards-" + salt} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {previews.map((pv, i) => {
              const isSelected = pv.id === selectedId;
              return (
                <motion.div key={pv.id} initial={{ opacity: 0, filter: "blur(8px)", y: 16 }} animate={{ opacity: 1, filter: "blur(0px)", y: 0 }} transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.1 }}>
                  <div
                    onClick={() => handleCardClick(pv)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e)=> { if(e.key==="Enter"||e.key===" ") { e.preventDefault(); handleCardClick(pv); } }}
                    className={"liquid-glass flex cursor-pointer flex-col rounded-[1.5rem] p-6 transition-all " + (isSelected ? "ring-1 ring-white" : "hover:ring-1 hover:ring-white/30")}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-xl italic text-white/40">{String(i + 1).padStart(2, "0")}</span>
                      {i === 1 ? <span className="rounded-full bg-white px-3 py-1 font-body text-[10px] font-semibold text-black">Most Popular</span> : <span className="rounded-full px-3 py-1 font-body text-[11px] font-semibold text-black" style={F.gradStyle(fusion.a, fusion.b)}>{pv.weeks} wks</span>}
                    </div>
                    <h3 className="mt-8 font-heading text-2xl italic leading-[1.05] tracking-[-1px] text-white">{pv.title}</h3>
                    <p className="mt-3 flex-1 font-body text-sm font-light text-white/60">{pv.summary}</p>
                    <div className="mt-8" style={{ height: 1.5, background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)` }} />
                    <ul className="mt-6 flex flex-col gap-2">
                      {(pv.outcomes || []).slice(0, 2).map((o) => (
                        <li key={o} className="flex gap-2.5 font-body text-[13px] font-light text-white/75"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/50" />{o}</li>
                      ))}
                    </ul>
                    <span className="mt-4 flex items-center gap-1 font-body text-xs text-white/40">Tap to preview<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg></span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      <div className="mt-10 flex flex-col items-center gap-4">
        <motion.button type="button" onClick={() => selected && choose(selected)} animate={selected ? { scale: [1, 1.03, 1] } : { scale: 1 }} transition={{ repeat: selected ? Infinity : 0, duration: 1.6, ease: "easeInOut" }} className={(selected ? "liquid-glass-strong text-white" : "liquid-glass text-white/30") + " flex items-center gap-2 rounded-full px-7 py-3 font-body text-sm font-medium"}>{selected ? "Start this roadmap" : "Select a path"}<Icons.ArrowUpRight className="h-4 w-4" /></motion.button>
        <button type="button" onClick={regenerate} className="flex items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm text-white/60 transition-colors hover:text-white"><Icons.Refresh className="h-4 w-4" />Show me different options</button>
      </div>
    </div>
  );
}

window.Roadmaps = Roadmaps;
