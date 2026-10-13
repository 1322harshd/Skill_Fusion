const { Reveal } = window;
const { SectionHeading } = window;

const BADGES = ["GitHub Synced", "Dual-Tagged", "Portfolio-Ready", "Verified Badges"];

const QUOTES = [
  {
    quote: "I fused Marketing with Python. Six weeks later I shipped a market-analysis tool that got me three interviews.",
    name: "Amara Osei",
    fusion: "Marketing × Python",
  },
  {
    quote: "The roadmap didn't feel like a course. It felt like a plan a senior would actually give you.",
    name: "Daniel Reyes",
    fusion: "Design × Code",
  },
  {
    quote: "Seeing my rarity score gave me real confidence. 3.1% of pairs are this rare — I lean into it now.",
    name: "Priya Nair",
    fusion: "Data × Writing",
  },
];

function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
}

function Community() {
  return (
    <section id="community" className="relative w-full bg-black py-28">
      <div className="px-8 md:px-16 lg:px-20">
        <SectionHeading title="Built by people fusing now" className="mb-12 max-w-2xl" />

        <Reveal className="mb-16 flex flex-wrap gap-2.5">
          {BADGES.map((t) => (
            <span key={t} className="liquid-glass rounded-full px-3.5 py-1 font-body text-[11px] font-medium text-white/90">
              {t}
            </span>
          ))}
        </Reveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {QUOTES.map((q, i) => (
            <Reveal key={q.name} delay={i * 0.12}>
              <figure className="liquid-glass flex h-full flex-col rounded-[1.25rem] p-6">
                <blockquote className="flex-1 font-body text-sm font-light leading-relaxed text-white/90">
                  "{q.quote}"
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="liquid-glass flex h-10 w-10 items-center justify-center rounded-full font-heading text-sm italic text-white">
                    {initials(q.name)}
                  </span>
                  <span>
                    <span className="block font-body text-sm font-medium text-white">{q.name}</span>
                    <span className="block font-body text-xs font-light text-white/60">{q.fusion}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

window.Community = Community;
