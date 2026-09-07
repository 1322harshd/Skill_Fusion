const { useState } = React;
const { AnimatePresence, motion } = window.Motion;
const { Icons } = window;
const Store = window.Store;
const { BlurText } = window;

const PERSONAS = ["Self Learner", "Career Changer", "Professional Expanding Expertise"];

const enter = (delay = 0) => ({
  initial: { filter: "blur(10px)", opacity: 0, y: 22 },
  animate: { filter: "blur(0px)", opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut", delay },
});

function StepDots({ step }) {
  return (
    <div className="mb-10 flex items-center justify-center gap-2.5">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={
            "h-2 w-8 rounded-full transition-colors " +
            (n <= step ? "bg-white" : "liquid-glass")
          }
        />
      ))}
    </div>
  );
}

function Onboarding() {
  const [step, setStep] = useState(1);
  const [personas, setPersonas] = useState([]);
  const [baseline, setBaseline] = useState(null);

  // auth state
  const [authMode, setAuthMode] = useState("signup"); // signup | login
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const isSignup = authMode === "signup";

  function validateAuth() {
    if (isSignup && !name.trim()) return "Please enter your full name";
    if (!email.trim()) return "Please enter your email";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Please enter a valid email";
    if (!password.trim()) return "Please enter your password";
    if (password.length < 6) return "Password must be at least 6 characters";
    return "";
  }

  const stepValid =
    step === 1 ? !validateAuth() && !authLoading : step === 2 ? personas.length > 0 : baseline !== null;

  function togglePersona(p) {
    setPersonas((xs) => (xs.includes(p) ? xs.filter((x) => x !== p) : [...xs, p]));
  }

  function applyAuthedUser(user) {
    Store.updateUser({
      userId: user.userId,
      name: user.fullName,
      handle: (user.email || "").split("@")[0].toLowerCase(),
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      personaTypes: user.personaTypes || [],
      baseline: user.baseline || null,
      skills: user.skills || [],
      githubUrl: user.githubUrl || "",
    });
  }

  async function handleAuthNext() {
    const err = validateAuth();
    if (err) { setAuthError(err); window.Toast.show(err, "error"); return; }
    setAuthError("");
    setAuthLoading(true);
    try {
      const payload = isSignup
        ? await window.Api.register({ name: name.trim(), email: email.trim(), password })
        : await window.Api.login({ email: email.trim(), password });
      const user = payload.user;
      applyAuthedUser(user);
      window.Toast.show(
        isSignup ? "Account created — check your email to verify" : "Welcome back",
        "success"
      );
      const hasBaseline = !!(user.baseline && user.baseline.method);
      const hasPersonas = !!(user.personaTypes && user.personaTypes.length);
      if (hasPersonas && hasBaseline) {
        window.Router.go("/dashboard");
        return;
      }
      if (hasPersonas) {
        setPersonas(user.personaTypes);
        setBaseline(user.baseline.method);
        setStep(3);
        return;
      }
      setStep(2);
    } catch (e) {
      const msg = e.message || "Something went wrong";
      setAuthError(msg);
      window.Toast.show(msg, "error");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      window.Toast.show("Enter your email above first", "error");
      return;
    }
    try {
      await window.Api.forgotPassword(email.trim());
    } catch (e) {
      // Falls through to the same message below regardless of outcome.
    }
    window.Toast.show("If that email exists, we've sent a reset link", "success");
  }

  function handlePersonaNext() {
    if (personas.length === 0) return;
    Store.updateUser({ personaTypes: personas });
    setStep(3);
    window.Api.updateMe({ personaTypes: personas }).catch(() => {});
  }

  function handleFinish() {
    if (!baseline) return;
    Store.updateUser({ baseline });
    window.Api.updateMe({ baseline: { method: baseline } }).catch(() => {});
    window.Router.go("/dashboard");
  }

  function next() {
    if (step === 1) handleAuthNext();
    else if (step === 2) handlePersonaNext();
    else handleFinish();
  }

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* same default black as dashboard empty state — no video, no box, just AmbientBackground */}

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
        <StepDots step={step} />

        <div className="min-h-[380px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="auth" {...enter()}>
                <BlurText
                  text={isSignup ? "Create your account" : "Welcome back"}
                  delay={0.05}
                  className="justify-center font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-6xl"
                />
                <p className="mt-4 text-center font-body text-sm font-light text-white/60">
                  {isSignup ? "Join Skill Fusion — fuse what you know into what's next." : "Sign in to continue your fusion."}
                </p>

                <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
                  {isSignup && (
                    <div className="liquid-glass-strong rounded-2xl px-5 py-4">
                      <label className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Full name</label>
                      <input
                        value={name}
                        onChange={(e) => { setName(e.target.value); setAuthError(""); }}
                        placeholder="Ada Lovelace"
                        className="mt-2 w-full bg-transparent font-body text-base text-white placeholder:text-white/30 outline-none"
                        autoComplete="name"
                      />
                    </div>
                  )}
                  <div className="liquid-glass-strong rounded-2xl px-5 py-4">
                    <label className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Email</label>
                    <input
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setAuthError(""); }}
                      placeholder="ada@skillfusion.ai"
                      type="email"
                      className="mt-2 w-full bg-transparent font-body text-base text-white placeholder:text-white/30 outline-none"
                      autoComplete="email"
                    />
                  </div>
                  <div className="liquid-glass-strong rounded-2xl px-5 py-4">
                    <label className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Password</label>
                    <input
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                      placeholder="••••••••"
                      type="password"
                      className="mt-2 w-full bg-transparent font-body text-base text-white placeholder:text-white/30 outline-none"
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      onKeyDown={(e)=> { if(e.key==="Enter") handleAuthNext(); }}
                    />
                  </div>
                  {authError && <p className="text-center font-body text-xs text-red-300">{authError}</p>}
                  <div className="flex items-center justify-center gap-1 pt-1">
                    <span className="font-body text-xs font-light text-white/50">{isSignup ? "Already have an account?" : "Don't have an account?"}</span>
                    <button type="button" onClick={()=> { setAuthMode(isSignup ? "login" : "signup"); setAuthError(""); }} className="font-body text-xs font-medium text-white hover:underline">
                      {isSignup ? "Log in" : "Sign up"}
                    </button>
                  </div>
                  {!isSignup && (
                    <div className="flex items-center justify-center pt-0.5">
                      <button type="button" onClick={handleForgotPassword} className="font-body text-xs font-light text-white/50 hover:text-white hover:underline">
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="2" {...enter()}>
                <BlurText
                  text="Which describes you?"
                  delay={0.05}
                  className="justify-center font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-6xl"
                />
                <p className="mt-4 text-center font-body text-sm font-light text-white/60">
                  Select all that apply — you can pick more than one
                </p>
                <div className="mt-8 flex flex-col gap-3">
                  {PERSONAS.map((p) => {
                    const on = personas.includes(p);
                    return (
                      <motion.button
                        key={p}
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => togglePersona(p)}
                        className={
                          (on ? "bg-white text-black" : "liquid-glass text-white/85 hover:text-white") +
                          " flex items-center justify-between rounded-2xl px-6 py-4 text-left font-body text-base font-medium transition-colors"
                        }
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={
                              "flex h-5 w-5 items-center justify-center rounded-md border text-transparent transition-colors " +
                              (on ? "border-white bg-white text-black" : "border-white/30")
                            }
                          >
                            <Icons.Check className="h-3.5 w-3.5" />
                          </span>
                          {p}
                        </span>
                        {on && <Icons.Check className="h-5 w-5 opacity-0" />}
                      </motion.button>
                    );
                  })}
                </div>
                <p className="mt-3 text-center font-body text-xs font-light text-white/50">
                  {personas.length === 0 ? "Select at least one to continue" : personas.length + " selected — you can add more"}
                </p>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="3" {...enter()}>
                <BlurText
                  text="How should we learn your skills?"
                  delay={0.05}
                  className="justify-center font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-6xl"
                />
                <p className="mt-4 text-center font-body text-sm font-light text-white/60">
                  Upload real evidence of what you've built — or take a quick five-minute quiz instead.
                </p>
                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    { key: "resume", title: "Upload a resume or GitHub", desc: "We read what you've already built and done." },
                    { key: "quiz", title: "5-min baseline quiz", desc: "Quick 5-minute check — no files needed." },
                  ].map((opt) => {
                    const on = baseline === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setBaseline(opt.key)}
                        className={
                          (on ? "bg-white text-black" : "liquid-glass text-white/85 hover:text-white") +
                          " rounded-2xl px-6 py-6 text-left transition-colors"
                        }
                        style={on ? { boxShadow: "0 0 0 1px rgba(255,255,255,0.9), 0 0 24px rgba(255,255,255,0.18)" } : undefined}
                      >
                        <span className="flex items-center justify-between font-body text-base font-medium">
                          {opt.title}
                          {on && <Icons.Check className="h-5 w-5" />}
                        </span>
                        <span className={"mt-2 block font-body text-sm font-light " + (on ? "text-black/60" : "text-white/60")}>
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3">
          <motion.button
            type="button"
            onClick={next}
            disabled={!stepValid}
            animate={stepValid ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={{ repeat: stepValid ? Infinity : 0, duration: 1.8, ease: "easeInOut" }}
            className={
              (stepValid ? "bg-white text-black" : "liquid-glass text-white/30") +
              " flex items-center gap-2 rounded-full px-7 py-3.5 font-body text-sm font-medium disabled:cursor-not-allowed"
            }
          >
            {step === 1 && authLoading ? (isSignup ? "Creating account…" : "Signing in…") : step === 3 ? "Go to dashboard" : "Continue"}
            <Icons.ArrowUpRight className="h-4 w-4" />
          </motion.button>
          {!stepValid && !authLoading && (
            <p className="font-body text-xs font-light text-white/50">
              {step === 1 ? "Fill in all fields to continue" : step === 2 ? "Select at least one option to continue" : "Choose how we learn your skills"}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

window.Onboarding = Onboarding;
