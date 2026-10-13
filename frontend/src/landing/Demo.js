const { useState } = React;
const { AnimatePresence, motion } = window.Motion;
const { Reveal } = window;
const { SectionHeading } = window;
const { Icons } = window;

const SKILLS = ["Design", "Code", "Data", "Writing", "Marketing", "Sales", "AI", "Illustration", "Product"];

const DURATIONS = ["4 days", "1 week", "2 weeks", "3 days", "6 days", "10 days"];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function fuseResult(a, b) {
  const seed = hash(a + "×" + b);
  const rarity = Math.round((0.6 + (seed % 275) / 10) * 10) / 10;
  const steps = [
    { num: "01", title: "Foundations", body: `Get fluent in ${b} applied to ${a}.`, dur: DURATIONS[seed % DURATIONS.length] },
    { num: "02", title: "First artifact", body: `Build a real ${a} artifact powered by ${b}.`, dur: DURATIONS[(seed >> 3) % DURATIONS.length] },
    { num: "03", title: "The project", body: `Ship the flagship ${a} + ${b} portfolio piece.`, dur: DURATIONS[(seed >> 5) % DURATIONS.length] },
    { num: "04", title: "Verified badge", body: "Publish it, sync to GitHub, earn your verified badge.", dur: DURATIONS[(seed >> 7) % DURATIONS.length] },
  ];
  return { rarity, steps };
}

function SkillChips({ label, selected, onSelect }) {
  return (
    <div>
      <p className="mb-3 font-body text-[11px] uppercase tracking-[0.18em] text-white/50">{label}</p>
      <div className="flex flex-wrap gap-2">
        {SKILLS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSelect(s)}
            className={
              (selected === s
                ? "bg-white text-black"
                : "liquid-glass text-white/85 hover:text-white") +
              " tappable rounded-full px-4 py-2 font-body text-sm font-medium transition-colors"
            }
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Demo() {
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);
  const [result, setResult] = useState(null);

  const ready = a && b;

  function fuse() {
    if (!ready) return;
    setResult(fuseResult(a, b));
  }

  function pickA(s) {
    setA(s);
    setResult(null);
  }
  function pickB(s) {
    setB(s);
    setResult(null);
  }

  return (
    <section id="demo" className="relative w-full bg-black py-28">
      <div className="px-8 md:px-16 lg:px-20">
        <SectionHeading kicker="Try It" title="Fuse your own skills" className="mb-16 max-w-2xl" />

        <Reveal className="mx-auto max-w-4xl">
          <div className="liquid-glass rounded-[1.5rem] p-8 md:p-10">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
              <SkillChips label="Skill one" selected={a} onSelect={pickA} />
              <SkillChips label="Skill two" selected={b} onSelect={pickB} />
            </div>

            <div className="mt-8 flex items-center justify-center">
              <motion.button
                type="button"
                onClick={fuse}
                disabled={!ready}
                whileTap={{ scale: 0.97 }}
                className={
                  (ready ? "liquid-glass-strong text-white" : "text-white/50") +
                  " flex items-center gap-2 rounded-full px-6 py-3 font-body text-sm font-medium disabled:cursor-not-allowed"
                }
              >
                Fuse {a && b ? `${a} × ${b}` : "two skills"}
                <Icons.Hub className="h-4 w-4" />
              </motion.button>
            </div>

            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, filter: "blur(6px)", y: 20 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={{ opacity: 0, filter: "blur(6px)", y: -10 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  className="mt-10"
                >
                  <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-8">
                    <div>
                      <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Your fusion</p>
                      <p className="mt-2 font-heading text-3xl italic tracking-[-1px] text-white">
                        {a} <span className="text-white/40">×</span> {b}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-6xl italic leading-none tracking-[-2px] text-white">
                        {result.rarity}%
                      </p>
                      <p className="mt-1 font-body text-xs font-light text-white/70">rarer than the average pair</p>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col gap-3">
                    {result.steps.map((s, i) => (
                      <motion.div
                        key={s.num}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 + i * 0.1 }}
                        className="liquid-glass flex items-center gap-4 rounded-[1rem] px-5 py-4"
                      >
                        <span className="w-8 font-heading text-xl italic text-white/40">{s.num}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-heading text-lg italic text-white">{s.title}</p>
                          <p className="truncate font-body text-[13px] font-light text-white/70">{s.body}</p>
                        </div>
                        <span className="shrink-0 font-body text-xs font-medium text-white/60">{s.dur}</span>
                      </motion.div>
                    ))}
                  </div>

                  <p className="mt-6 text-center font-body text-[11px] font-light text-white/50">
                    Sample output — your real roadmap and score are built live from job-market data when you sign up.
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

window.Demo = Demo;
