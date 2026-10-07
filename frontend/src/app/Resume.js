const { useState, useEffect } = React;
const { motion, AnimatePresence } = window.Motion;
const { Icons } = window;
const Store = window.Store;
const { AiSteps } = window;

const SAMPLE_LISTING = `Role: Product Designer (Design Engineering)
About: We're a Series B design tool looking for someone who can design AND build. You'll own features from concept to shipped CSS.
Must-haves: interaction design, prototyping, shipping code in production.
Nice to have: data literacy, motion, a portfolio that shows both sides.`;

const RESUME_LOADING_STEPS = [
  { label: "Reading the listing", foot: "Extracting the skills it actually asks for." },
  { label: "Pulling evidence", foot: "Matching your Growth Log to each requirement." },
  { label: "Drafting your document", foot: "Writing it to sound like you, not a template." },
];

const enter = window.MotionKit.enter;

function resumeText(res) {
  const lines = [
    res.headline,
    "",
    "Summary",
    res.summary,
    "",
    "Skills",
    res.skills.join("  ·  "),
    "",
    "Evidence",
  ];
  res.evidence.forEach((e) => lines.push(`• ${e.title} (${e.date}) — ${e.description}`));
  return lines.join("\n");
}

function Resume() {
  const [listing, setListing] = useState("");
  const [phase, setPhase] = useState("input");
  const [tab, setTab] = useState("resume");
  const [res, setRes] = useState(null);

  useEffect(() => {
    const f = Store.getSnapshot().fusions[0];
    if (f) window.Ambient.setFusion(f.a, f.b);
    else window.Ambient.clear();
  }, []);

  function generate() {
    if (!listing.trim()) return;
    setRes(Store.buildResume(listing));
    setTab("resume");
    setPhase("loading");
  }

  function download() {
    const text = tab === "resume" ? resumeText(res) : res.coverLetter;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tab === "resume" ? "resume.txt" : "cover-letter.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function copy() {
    navigator.clipboard.writeText(tab === "resume" ? resumeText(res) : res.coverLetter);
    window.Toast.show("Copied to clipboard", "success");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div {...enter()}>
        <h1 className="mt-3 font-heading text-5xl italic leading-[1.0] tracking-[-3px] text-white md:text-6xl">
          Resume & Cover Letter
        </h1>
      </motion.div>

      <div className="mt-10">
        <AnimatePresence mode="wait">
          {phase === "input" && (
            <motion.div key="input" {...enter(0.05)} className="liquid-glass-strong rounded-[1.5rem] p-8 md:p-10">
              <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Paste a job listing</p>
              <textarea
                value={listing}
                onChange={(e) => setListing(e.target.value)}
                rows={6}
                placeholder="Paste the job description here…"
                className="mt-4 w-full rounded-xl bg-black/40 px-4 py-3 font-body text-sm text-white outline-none ring-1 ring-white/15 focus:ring-white/40"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setListing(SAMPLE_LISTING)}
                  className="tappable font-body text-sm text-white/60 transition-colors hover:text-white"
                >
                  Use sample listing
                </button>
                <motion.button
                  type="button"
                  onClick={generate}
                  disabled={!listing.trim()}
                  whileTap={{ scale: 0.97 }}
                  className={
                    (listing.trim() ? "bg-white text-black" : "liquid-glass text-white/50") +
                    " flex items-center gap-2 rounded-full px-6 py-3 font-body text-sm font-medium disabled:cursor-not-allowed"
                  }
                >
                  Generate
                  <Icons.Doc className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === "loading" && (
            <motion.div key="loading" {...enter(0.05)}>
              <div className="liquid-glass-strong rounded-[1.5rem]">
                <div className="border-b border-white/10 px-6 py-6 text-center">
                  <p className="font-heading text-2xl italic text-white">Drafting your document</p>
                </div>
                <AiSteps steps={RESUME_LOADING_STEPS} speed={1000} onDone={() => setPhase("done")} />
              </div>
            </motion.div>
          )}

          {phase === "done" && res && (
            <motion.div key="done" {...enter(0.05)}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="liquid-glass flex items-center gap-1 rounded-full p-1">
                  {[
                    ["resume", "Resume"],
                    ["cover", "Cover letter"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={
                        (tab === key ? "bg-white text-black" : "text-white/70 hover:text-white") +
                        " tappable rounded-full px-4 py-1.5 font-body text-sm font-medium transition-colors"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={copy}
                    className="tappable liquid-glass-strong flex items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm font-medium text-white"
                  >
                    <Icons.Copy className="h-4 w-4" />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={download}
                    className="tappable flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-body text-sm font-medium text-black"
                  >
                    <Icons.Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] bg-[var(--color-paper)] p-8 text-black shadow-[var(--shadow-paper)] md:p-12">
                {tab === "resume" ? (
                  <div className="font-body">
                    <p className="font-heading text-3xl italic">{res.headline}</p>
                    <div className="mt-6">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-black/50">Summary</p>
                      <p className="mt-2 text-sm font-light leading-relaxed">{res.summary}</p>
                    </div>

                    <div className="mt-8">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-black/50">Skills</p>
                      <p className="mt-2 text-sm leading-relaxed">{res.skills.join(" · ")}</p>
                    </div>

                    <div className="mt-8">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-black/50">Evidence</p>
                      <div className="mt-3 flex flex-col gap-3">
                        {res.evidence.map((e) => (
                          <div key={e.title}>
                            <p className="text-sm font-medium">{e.title}</p>
                            <p className="text-[13px] font-light text-black/60">{e.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="font-body whitespace-pre-line text-sm font-light leading-relaxed">
                    {res.coverLetter}
                  </div>
                )}
              </div>

              <div className="liquid-glass mt-6 rounded-2xl p-5">
                <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">
                  Grounded in your Growth Log
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {res.evidence.map((e) => (
                    <span key={e.title} className="liquid-glass rounded-full px-3 py-1.5 font-body text-xs font-medium text-white/85">
                      {e.title}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

window.Resume = Resume;
