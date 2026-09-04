const { motion } = window.Motion;
const { Navbar } = window;
const { FadingVideo } = window;
const { BlurText } = window;
const { Icons } = window;

const enter = (delay) => window.MotionKit.enter(delay, { y: 20, duration: 0.7 });

function Hero() {
  return (
    <section id="top" className="relative min-h-dvh w-full overflow-hidden bg-black">
      <FadingVideo
        src={window.VIDEOS.HERO}
        className="absolute left-1/2 top-0 z-0 -translate-x-1/2 object-cover object-top"
        style={{ width: "120%", height: "120%" }}
      />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <Navbar />

        <div className="flex flex-1 flex-col items-center justify-center px-4 pt-24 text-center">
          <motion.div {...enter(0.4)}>
            <div className="liquid-glass flex items-center rounded-full py-1 pl-1">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">New</span>
              <span className="px-3 text-sm text-white/90">Fusion Score Is Now Live — See Where You Rank</span>
            </div>
          </motion.div>

          <div className="mt-6">
            <BlurText
              text="Fuse What You Know Into What You'll Become"
              delay={0.5}
              className="max-w-4xl justify-center pb-1 font-heading text-6xl italic leading-[1.1] tracking-[-4px] text-white md:text-7xl lg:text-[5rem]"
            />
          </div>

          <motion.p
            {...enter(0.8)}
            className="mt-4 max-w-2xl font-body text-sm font-light leading-tight text-white md:text-base"
          >
            Combine any two skills and our AI builds your personalized roadmap, a real project, and a data-backed
            score of how rare your combination actually is.
          </motion.p>

          <motion.div {...enter(1.1)} className="mt-6 flex items-center gap-6">
            <a
              href="#/onboarding"
              className="tappable liquid-glass-strong flex items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm font-medium text-white"
            >
              Start Your Fusion
              <Icons.ArrowUpRight className="h-5 w-5" />
            </a>
            <a href="#how-it-works" className="flex items-center gap-2 font-body text-sm text-white">
              <Icons.Play className="h-4 w-4" />
              See How It Works
            </a>
          </motion.div>

          <motion.div {...enter(1.3)} className="mt-8 grid w-full max-w-xl grid-cols-1 gap-4 min-[456px]:grid-cols-2">
            <div className="liquid-glass flex w-full flex-col justify-between gap-3 rounded-[1.25rem] p-5">
              <Icons.HubLine className="h-7 w-7 text-white" />
              <div>
                <p className="font-heading text-4xl italic leading-none tracking-[-1px] text-white">12,000+</p>
                <p className="mt-2 font-body text-xs font-light text-white">Real Job Listings Analyzed</p>
              </div>
            </div>
            <div className="liquid-glass flex w-full flex-col justify-between gap-3 rounded-[1.25rem] p-5">
              <Icons.MapLine className="h-7 w-7 text-white" />
              <div>
                <p className="font-heading text-4xl italic leading-none tracking-[-1px] text-white">4–12 Wk</p>
                <p className="mt-2 font-body text-xs font-light text-white">Personalized Roadmaps</p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div {...enter(1.4)} className="flex flex-col items-center gap-4 pb-8">
          <span className="liquid-glass rounded-full px-3.5 py-1 font-body text-xs font-medium text-white">
            Grounded in real infrastructure, not vibes
          </span>
          <div className="flex flex-wrap items-center justify-center gap-12 font-heading text-2xl italic tracking-tight text-white md:gap-16 md:text-3xl">
            <span>Adzuna</span>
            <span>GitHub</span>
            <span>Ollama</span>
            <span>PostgreSQL</span>
            <span>Open Source</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

window.Hero = Hero;
