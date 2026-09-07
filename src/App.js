const _consoleError = console.error;
console.error = (...args) => {
  const msg = String(args[0] || "");
  if (/Each child in a list|style prop did not match|React does not recognize/i.test(msg)) return;
  _consoleError(...args);
};

const { useEffect } = React;
const { AnimatePresence, motion, MotionConfig } = window.Motion;
const { useRoute } = window;
const { AppShell, ScreenPlaceholder } = window;

const { Hero } = window;
const { Capabilities } = window;
const { HowItWorks } = window;
const { Score } = window;
const { Demo } = window;
const { Community } = window;
const { Pricing } = window;
const { FAQ } = window;
const { CTA } = window;
const { Footer } = window;

const LANDING = new Set([
  "/",
  "/top",
  "/capabilities",
  "/how-it-works",
  "/community",
  "/pricing",
  "/demo",
  "/faq",
  "/cta",
]);

function Landing() {
  return (
    <main className="bg-black text-white">
      <Hero />
      <Capabilities />
      <HowItWorks />
      <Score />
      <Demo />
      <Community />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}

const ROUTES = [
  { pattern: "/onboarding", render: () => <window.Onboarding /> },
  { pattern: "/fuse", render: () => <window.Fuse /> },
  { pattern: "/roadmaps", render: () => <window.Roadmaps /> },
  { pattern: "/roadmaps/:id", render: (p) => <window.RoadmapDetail id={p.id} /> },
  { pattern: "/projects/:id", render: (p) => <window.Project id={p.id} /> },
  { pattern: "/score/:fusionId", render: (p) => <window.ScoreScreen fusionId={p.fusionId} /> },
  { pattern: "/log", render: () => <window.GrowthLog /> },
  { pattern: "/resume", render: () => <window.Resume /> },
  { pattern: "/posts", render: () => <window.Posts /> },
  { pattern: "/posts/:entryId", render: (p) => <window.Posts entryId={p.entryId} /> },
  { pattern: "/connect", render: () => <window.Connect /> },
  { pattern: "/dashboard", render: () => <window.Dashboard /> },
];

function ScreenFor() {
  for (const r of ROUTES) {
    const params = window.Router.match(r.pattern);
    if (params) return r.render(params);
  }
  return <ScreenPlaceholder route={window.Router.current()} />;
}

function App() {
  const route = useRoute();
  const isLanding = LANDING.has(route);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  const content = isLanding ? (
    <Landing />
  ) : (
    <AppShell route={route}>
      <ScreenFor />
    </AppShell>
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isLanding ? "landing" : route}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>
);
