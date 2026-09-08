const { motion } = window.Motion;
const { FadingVideo } = window;
const { Icons } = window;

function CTA() {
  return (
    <section id="cta" className="relative flex min-h-[90dvh] w-full items-center overflow-hidden bg-black py-32">
      <FadingVideo src={window.VIDEOS.CTA} className="absolute inset-0 z-0 h-full w-full object-cover" />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-8 text-center">
        <motion.h2
          initial={{ filter: "blur(6px)", opacity: 0, y: 24 }}
          whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
          className="max-w-2xl font-heading text-5xl italic leading-[0.85] tracking-[-3px] text-white md:text-7xl lg:text-[5.5rem]"
        >
          Fuse what you know into what you'll become
        </motion.h2>

        <motion.p
          initial={{ filter: "blur(6px)", opacity: 0, y: 20 }}
          whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.35 }}
          className="mt-6 max-w-xl font-body text-sm font-light leading-tight text-white md:text-base"
        >
          Start free, no credit card. Your first fusion is live in under five minutes.
        </motion.p>

        <motion.div
          initial={{ filter: "blur(6px)", opacity: 0, y: 20 }}
          whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.5 }}
          className="mt-10 flex flex-col items-center gap-5"
        >
          <a
            href="#/onboarding"
            className="tappable liquid-glass-strong flex items-center gap-2 rounded-full px-7 py-3.5 font-body text-sm font-medium text-white"
          >
            Start Your Fusion
            <Icons.ArrowUpRight className="h-5 w-5" />
          </a>
          <span className="font-body text-xs font-light text-white/60">
            Backed by Adzuna · GitHub · Ollama · PostgreSQL · Open Source
          </span>
        </motion.div>
      </div>
    </section>
  );
}

window.CTA = CTA;
