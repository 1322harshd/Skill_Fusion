const { FadingVideo } = window;
const { Reveal } = window;
const { SectionHeading } = window;

const STEPS = [
  {
    num: "01",
    title: "Pick two skills",
    body: "Anything works — design + code, writing + data, sales + AI. If it's two skills, it's a fusion.",
  },
  {
    num: "02",
    title: "AI finds the real overlap",
    body: "Our engine scans real job listings to find where your combination is genuinely valued — not a generic course mashup.",
  },
  {
    num: "03",
    title: "Follow a 4–12 week roadmap",
    body: "Three real outcome paths. Pick a direction, check off milestones, and finish with a real project.",
  },
  {
    num: "04",
    title: "Earn a verified score",
    body: "Your fusion gets a rarity score grounded in job-market data, plus growth badges your GitHub can prove.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative w-full overflow-hidden bg-black py-28">
      <FadingVideo src={window.VIDEOS.HOW_IT_WORKS} className="absolute inset-0 z-0 h-full w-full object-cover" />

      <div className="relative z-10 px-8 md:px-16 lg:px-20">
        <SectionHeading kicker="How It Works" title="Two skills. One future." className="mb-20 max-w-2xl" />

        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-0 right-0 top-8 hidden h-px bg-white/15 lg:block" aria-hidden="true" />
          {STEPS.map((s, i) => (
            <Reveal key={s.num} delay={i * 0.14} className="relative">
              <div className="liquid-glass flex h-full flex-col rounded-[1.25rem] p-6">
                <span className="font-heading text-5xl italic leading-none text-white/40">{s.num}</span>
                <span className="mt-6 h-1.5 w-1.5 rounded-full bg-white/60" aria-hidden="true" />
                <h3 className="mt-4 font-heading text-2xl italic leading-tight text-white">{s.title}</h3>
                <p className="mt-3 font-body text-sm font-light leading-snug text-white/90">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

window.HowItWorks = HowItWorks;
