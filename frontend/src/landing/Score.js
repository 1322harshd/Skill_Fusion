const { motion } = window.Motion;
const { Reveal } = window;
const { SectionHeading } = window;

const SCORE_META = [
  { value: "12,000+", label: "Listings scanned" },
  { value: "37%", label: "Pay delta vs. single skill" },
  { value: "+4.1%/yr", label: "Demand growth" },
];

function Score() {
  return (
    <section id="score" className="relative w-full bg-black py-28">
      <div className="px-8 md:px-16 lg:px-20">
        <SectionHeading title="How rare is your combination?" className="mb-16 max-w-2xl" />

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal className="lg:pr-10">
            <div className="flex items-end gap-4">
              <span className="font-heading text-8xl italic leading-none tracking-[-3px] text-white md:text-9xl">
                2.4%
              </span>
              <p className="mb-3 max-w-[16ch] font-body text-sm font-light leading-snug text-white/80">
                of skill pairs are rarer than this one.
              </p>
            </div>
            <p className="mt-8 max-w-md font-body text-sm font-light leading-snug text-white/80">
              Fusion Score is computed from real job-market demand — where your combination actually shows up in
              listings, how much it's worth, and whether it's growing. No vibes, no surveys.
            </p>
          </Reveal>

          <Reveal delay={0.15} className="flex flex-col justify-center">
            <div className="flex items-end justify-between">
              <span className="font-body text-xs text-white/60">More common</span>
              <span className="font-body text-xs text-white/60">Rarer</span>
            </div>
            <div className="relative mt-3">
              <div className="relative h-[3px] w-full rounded-full bg-white/15">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-white"
                  initial={{ width: 0 }}
                  whileInView={{ width: "97.6%" }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                />
              </div>
              <motion.span
                className="absolute -top-4 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.8)]"
                initial={{ left: "0%" }}
                whileInView={{ left: "97.6%" }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              />
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              {SCORE_META.map((m, i) => (
                <Reveal key={m.label} delay={0.35 + i * 0.1}>
                  <div className="liquid-glass flex flex-col gap-1 rounded-[1rem] px-5 py-3">
                    <span className="font-heading text-xl italic leading-none text-white">{m.value}</span>
                    <span className="font-body text-[11px] font-light text-white/70">{m.label}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

window.Score = Score;
