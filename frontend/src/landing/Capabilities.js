const { motion } = window.Motion;
const { FadingVideo } = window;
const { Icons } = window;

const CARDS = [
  {
    Icon: Icons.Hub,
    tags: ["Real Overlap", "Job-Data Grounded", "Any Domain", "No Guesswork"],
    title: "Fusion Engine",
    body: "Our AI finds the real overlap between any two skills — grounded in actual job-market data, not a generic course mashup.",
  },
  {
    Icon: Icons.Map,
    tags: ["3 Outcome Paths", "4–12 Weeks", "Real Projects", "Not Just Courses"],
    title: "Living Roadmap",
    body: "Three real-world outcome paths, not one generic plan. Pick the direction, follow a 4–12 week roadmap, finish with a real project.",
  },
  {
    Icon: Icons.CheckCircle,
    tags: ["Verified Badges", "GitHub Synced", "Dual-Tagged", "Portfolio-Ready"],
    title: "Verified Growth",
    body: "Every achievement tagged by skill and by soft skill, synced from GitHub where it's real, and verifiable — not just self-reported.",
  },
];

function Capabilities() {
  return (
    <section id="capabilities" className="relative min-h-dvh w-full overflow-hidden bg-black">
      <FadingVideo
        src={window.VIDEOS.CAPABILITIES}
        className="absolute inset-0 z-0 h-full w-full object-cover"
      />

      <div className="relative z-10 flex min-h-dvh flex-col px-8 pb-10 pt-24 md:px-16 lg:px-20">
        <div className="mb-auto">
          <motion.h2
            initial={{ filter: "blur(6px)", opacity: 0, y: 20 }}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
            className="font-heading text-6xl italic leading-[1.0] tracking-[-3px] text-white md:text-7xl lg:text-[6rem]"
          >
            Learning<br />reimagined
          </motion.h2>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {CARDS.map((card, i) => (
            <motion.article
              key={card.title}
              initial={{ filter: "blur(6px)", opacity: 0, y: 30 }}
              whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.12 }}
              className="liquid-glass flex min-h-[360px] flex-col rounded-[1.25rem] p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="liquid-glass flex h-11 w-11 items-center justify-center rounded-[0.75rem]">
                  <card.Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex max-w-[70%] flex-wrap justify-end gap-1.5">
                  {card.tags.map((t) => (
                    <span
                      key={t}
                      className="liquid-glass whitespace-nowrap rounded-full px-3 py-1 font-body text-[11px] text-white/90"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex-1" />

              <div className="mt-6">
                <h3 className="font-heading text-3xl italic leading-none tracking-[-1px] text-white md:text-4xl">
                  {card.title}
                </h3>
                <p className="mt-3 max-w-[32ch] font-body text-sm font-light leading-snug text-white/90">
                  {card.body}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

window.Capabilities = Capabilities;
