const { Reveal } = window;
const { SectionHeading } = window;
const { Icons } = window;

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    blurb: "For the curious.",
    features: ["2 fusions", "1 active roadmap", "Community access", "Fusion score basics"],
    cta: "Start Free",
    featured: false,
  },
  {
    name: "Fusion Pro",
    price: "$9",
    period: "/month",
    blurb: "For the serious builder.",
    features: [
      "Unlimited fusions",
      "All 3 outcome paths",
      "Verified growth badges",
      "GitHub auto-posts",
      "Score history & trends",
    ],
    cta: "Start 14-Day Trial",
    featured: true,
  },
  {
    name: "Teams",
    price: "$24",
    period: "/seat /month",
    blurb: "For squads and orgs.",
    features: ["Everything in Pro", "Shared fusions", "Admin dashboard", "Priority roadmap builds"],
    cta: "Contact Sales",
    featured: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="relative w-full bg-black py-28">
      <div className="px-8 md:px-16 lg:px-20">
        <SectionHeading title="Start free, fuse deeper" className="mb-16 max-w-2xl" />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.12}>
              <div
                className={
                  (t.featured
                    ? "bg-white text-black"
                    : "liquid-glass text-white") +
                  " relative flex h-full flex-col rounded-[1.5rem] p-8"
                }
              >
                {t.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-black px-3 py-1 font-body text-[11px] font-medium text-white">
                    Most popular
                  </span>
                )}
                <h3 className="font-heading text-3xl italic leading-none">{t.name}</h3>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-heading text-5xl italic leading-none tracking-[-2px]">{t.price}</span>
                  <span className={t.featured ? "font-body text-xs text-black/60" : "font-body text-xs text-white/60"}>
                    {t.period}
                  </span>
                </div>
                <p className={"mt-3 font-body text-sm font-light " + (t.featured ? "text-black/70" : "text-white/70")}>
                  {t.blurb}
                </p>
                <ul className="mt-8 flex flex-1 flex-col gap-3">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 font-body text-sm font-light">
                      <Icons.CheckCircle
                        className={"h-4 w-4 shrink-0 " + (t.featured ? "text-black/70" : "text-white/70")}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#demo"
                  className={
                    (t.featured
                      ? "bg-black text-white hover:opacity-90"
                      : "liquid-glass-strong text-white") +
                    " mt-8 inline-flex items-center justify-center rounded-full px-5 py-2.5 font-body text-sm font-medium transition-opacity"
                  }
                >
                  {t.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-10 text-center">
          <p className="font-body text-xs font-light text-white/50">All prices in USD, billed monthly. Cancel anytime.</p>
        </Reveal>
      </div>
    </section>
  );
}

window.Pricing = Pricing;
