const { useState } = React;
const { AnimatePresence, motion } = window.Motion;
const { Reveal } = window;
const { SectionHeading } = window;

const FAQS = [
  {
    q: "What counts as a skill?",
    a: "Anything you can learn and apply — hard skills like Python or Figma, soft skills like writing or sales. If you can name it, you can fuse it.",
  },
  {
    q: "Where does the Fusion Score come from?",
    a: "Real job-market data. We analyze listings to measure how often your combination appears, how much it pays, and whether demand is growing.",
  },
  {
    q: "How long does a roadmap take?",
    a: "Most fusions run 4–12 weeks. You get three outcome paths — portfolio, freelance, or product — so you pick the finish line that matters to you.",
  },
  {
    q: "Do I need to be an expert first?",
    a: "No. You need genuine interest and about 30 minutes a day. The roadmap starts at the overlap, not from scratch.",
  },
  {
    q: "Is my progress really verifiable?",
    a: "Yes. Achievements are dual-tagged by skill and soft skill, and synced from GitHub where they're real — so a recruiter can actually check them.",
  },
  {
    q: "What if I want to change skills mid-roadmap?",
    a: "Swap anytime. Your score and roadmap recompute from your new combination, and your old progress stays on your profile.",
  },
];

const PlusIcon = ({ open }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    className={"h-4 w-4 shrink-0 text-white/70 transition-transform duration-300 " + (open ? "rotate-45" : "")}
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

function FaqItem({ faq, open, onToggle }) {
  return (
    <div className="liquid-glass rounded-[1.25rem] px-6 py-5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="tappable flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="font-heading text-xl italic leading-snug text-white md:text-2xl">{faq.q}</span>
        <PlusIcon open={open} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="pt-4 font-body text-sm font-light leading-relaxed text-white/80">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="relative w-full bg-black py-28">
      <div className="mx-auto max-w-3xl px-8 md:px-16 lg:px-20">
        <SectionHeading title="Questions, answered" className="mb-16" />
        <div className="flex flex-col gap-3">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 0.06} amount={0.4}>
              <FaqItem faq={f} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

window.FAQ = FAQ;
