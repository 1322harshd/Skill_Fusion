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

const { Navbar } = window;
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
  "/score",
  "/community",
  "/pricing",
  "/demo",
  "/faq",
  "/cta",
]);

function Landing() {
  return (
    <main className="bg-black text-white">
      <Navbar />
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
  { pattern: "/verify-email", render: () => <window.VerifyEmail /> },
  { pattern: "/reset-password", render: () => <window.ResetPassword /> },
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
    if (isLanding && route !== "/" && route !== "/top") {
      const el = document.getElementById(route.slice(1));
      if (el) {
        el.scrollIntoView({ block: "start" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [route, isLanding]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;

    const state = params.get("state");
    const expected = sessionStorage.getItem("gh_oauth_state");
    sessionStorage.removeItem("gh_oauth_state");
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);

    if (!state || state !== expected) {
      window.Toast.show("GitHub connection failed — please try again.", "error");
      return;
    }
    window.Api.githubConnect(code)
      .then((data) => {
        window.Store.updateUser({ githubUrl: data.user.githubUrl, githubConnected: !!data.user.githubConnected });
        window.Store.loadGithubContributions().catch(() => {});
        window.Toast.show("GitHub connected", "success");
        window.Router.go("/log");
      })
      .catch((e) => {
        window.Toast.show(e.message || "Couldn't connect GitHub", "error");
      });
  }, []);

  useEffect(() => {
    window.Api.bootstrap().then((user) => {
      if (!user) return;
      window.Store.updateUser({
        userId: user.userId,
        name: user.fullName,
        handle: (user.email || "").split("@")[0].toLowerCase(),
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        personaTypes: user.personaTypes || [],
        baseline: user.baseline || null,
        skills: user.skills || [],
        githubUrl: user.githubUrl || "",
        githubConnected: !!user.githubConnected,
      });
      const cur = window.Router.current();
      const onboarded = !!(user.personaTypes && user.personaTypes.length && user.baseline && user.baseline.method);
      if (onboarded && (cur === "/" || cur === "/onboarding")) {
        window.Router.go("/dashboard");
      }
      window.Store.loadGrowthLog().catch(() => {});
    });
  }, []);

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
