const { motion, AnimatePresence } = window.Motion;
const { Icons } = window;
const F = window.Fusion;

const NAV = [
  ["Dashboard", "/dashboard", "Grid"],
  ["Fuse", "/fuse", "Bolt"],
  ["Roadmaps", "/roadmaps", "MapLine"],
  ["Log", "/log", "List"],
  ["Resume", "/resume", "Doc"],
  ["Connect", "/connect", "Chat"],
];

const AVATAR_COLORS = ["#3FB6C6", "#D96C92", "#CDA62F", "#52A970", "#7D84CE", "#8A5CF6", "#E88F3D", "#4FB98A"];

function avatarStyle(handle) {
  const c = AVATAR_COLORS[F.hash(handle || "?") % AVATAR_COLORS.length];
  return { background: `linear-gradient(135deg, ${c}, ${F.hexA(c, 0.55)})` };
}

function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function Avatar({ handle, name, size = "md", className = "" }) {
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" };
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-body font-semibold text-black ${sizes[size]} ${className}`}
      style={avatarStyle(handle || name || "?")}
    >
      {initials(name || handle)}
    </span>
  );
}

window.Avatar = Avatar;

(function () {
  let list = [];
  let version = 0;
  const listeners = new Set();

  function emit() {
    listeners.forEach((fn) => fn());
  }

  window.Toast = {};

  window.Toast.show = function (msg, kind = "default") {
    const item = { id: "t" + Date.now() + Math.random(), msg, kind };
    list = [...list, item];
    version++;
    emit();
    setTimeout(() => {
      list = list.filter((t) => t.id !== item.id);
      version++;
      emit();
    }, 3400);
  };

  window.Toast.use = function () {
    return React.useSyncExternalStore(
      (fn) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      () => {
        void version;
        return list;
      }
    );
  };
})();

function isActive(to, route) {
  if (to === "/dashboard") return route === "/dashboard";
  return route === to || route.startsWith(to);
}

function ToastHost() {
  const toasts = window.Toast.use();
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-8">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, filter: "blur(8px)", y: 14 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={{ opacity: 0, filter: "blur(8px)", y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="liquid-glass-strong flex items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm font-medium text-white"
          >
            {t.kind === "success" && <Icons.Check className="h-4 w-4 text-white" />}
            {t.kind === "error" && <Icons.X className="h-4 w-4 text-white" />}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function IosToggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={"relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full p-1 transition-colors " + (on ? "bg-white" : "bg-white/20")}
    >
      <span className={"inline-block h-5 w-5 rounded-full bg-white shadow transition-transform " + (on ? "translate-x-[24px] bg-black" : "translate-x-0")} style={on ? { background: "#000" } : { background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function IosSlider({ value, min, max, step, onChange, label }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="font-body text-xs text-white/40">A</span>
      <div className="relative flex-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="ios-slider h-1 w-full appearance-none rounded-full bg-white/20 outline-none"
          style={{ background: `linear-gradient(90deg, #fff 0%, #fff ${pct}%, rgba(255,255,255,0.2) ${pct}%, rgba(255,255,255,0.2) 100%)` }}
        />
        <style>{`.ios-slider::-webkit-slider-thumb{ -webkit-appearance:none; width:26px; height:26px; border-radius:9999px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.35); cursor:pointer; border:0; } .ios-slider::-moz-range-thumb{ width:26px; height:26px; border-radius:9999px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.35); cursor:pointer; border:0; }`}</style>
      </div>
      <span className="font-body text-base font-semibold text-white/90">A</span>
    </div>
  );
}

function AppearancePanel() {
  const a = window.Appearance.useStore();
  return (
    <div className="flex flex-col gap-6">
      {/* Text Size */}
      <div className="liquid-glass rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <Icons.Type className="h-4 w-4 text-white/60" />
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Text Size</p>
          <span className="ml-auto font-body text-xs text-white/60">{a.textSize}%</span>
        </div>
        <div className="mt-4">
          <IosSlider value={a.textSize} min={80} max={135} step={5} onChange={(v) => window.Appearance.set({ textSize: v })} label="Text Size" />
          <div className="mt-2 flex justify-between font-body text-[10px] text-white/30">
            <span>Smaller</span>
            <span>Larger</span>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-black/30 p-3 text-center">
          <p className="font-body text-sm text-white/90" style={{ fontSize: (14 * a.textSize/100) + "px", fontWeight: a.boldText ? 600 : 400 }}>Preview — The quick brown fox jumps</p>
        </div>
      </div>

      {/* Bold Text */}
      <div className="liquid-glass flex items-center justify-between rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <Icons.Bold className="h-4 w-4 text-white/60" />
          <div>
            <p className="font-body text-sm font-medium text-white">Bold Text</p>
            <p className="font-body text-xs font-light text-white/50">Heavier strokes</p>
          </div>
        </div>
        <IosToggle on={a.boldText} onChange={(v) => window.Appearance.set({ boldText: v })} label="Bold Text" />
      </div>

      {/* Liquid Glass */}
      <div className="liquid-glass rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <Icons.Glass className="h-4 w-4 text-white/60" />
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Liquid Glass</p>
          <span className="ml-auto font-body text-xs text-white/60">{a.glassLevel <= 20 ? "Clear" : a.glassLevel >= 80 ? "Frosted" : a.glassLevel + "%"}</span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="font-body text-[10px] text-white/40">Clear</span>
          <div className="relative flex-1">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={a.glassLevel}
              onChange={(e) => window.Appearance.set({ glassLevel: Number(e.target.value) })}
              aria-label="Liquid Glass"
              className="ios-slider h-1 w-full appearance-none rounded-full bg-white/20 outline-none"
              style={{ background: `linear-gradient(90deg, #fff 0%, #fff ${a.glassLevel}%, rgba(255,255,255,0.2) ${a.glassLevel}%, rgba(255,255,255,0.2) 100%)` }}
            />
          </div>
          <span className="font-body text-[10px] text-white/40">Frosted</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="liquid-glass flex h-16 items-center justify-center rounded-xl text-xs text-white/70">Card preview</div>
          <div className="liquid-glass-strong flex h-16 items-center justify-center rounded-xl text-xs text-white/70">Strong preview</div>
        </div>
        <p className="mt-2 font-body text-[11px] font-light text-white/40">Default is Clear (pure liquid). Drag to Frosted for more blur & haze.</p>
      </div>

      {/* Color Filters */}
      <div className="liquid-glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.Palette className="h-4 w-4 text-white/60" />
            <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Color Filters</p>
          </div>
          <IosToggle on={a.colorFiltersEnabled} onChange={(v) => window.Appearance.set({ colorFiltersEnabled: v })} label="Color Filters" />
        </div>
        <p className="mt-2 font-body text-xs font-light leading-relaxed text-white/50">Accessibility → Color Filters. Corrects for color vision.</p>

        {a.colorFiltersEnabled && (
          <div className="mt-4 flex flex-col gap-1">
            {[
              ["grayscale", "Grayscale"],
              ["protanopia", "Red/Green Filter", "Protanopia"],
              ["deuteranopia", "Green/Red Filter", "Deuteranopia"],
              ["tritanopia", "Blue/Yellow Filter", "Tritanopia"],
              ["tint", "Color Tint"],
            ].map(([key, label, desc]) => {
              const on = a.filterType === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => window.Appearance.set({ filterType: key })}
                  className={"flex items-center justify-between rounded-xl px-4 py-3 text-left transition-colors " + (on ? "bg-white text-black" : "liquid-glass text-white/85 hover:text-white")}
                >
                  <div>
                    <p className="font-body text-sm font-medium">{label}</p>
                    {desc && <p className={"font-body text-xs " + (on ? "text-black/60" : "text-white/50")}>{desc}</p>}
                  </div>
                  {on && <Icons.Check className="h-4 w-4" />}
                </button>
              );
            })}

            <div className="mt-4 liquid-glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="font-body text-xs font-medium text-white">Intensity</p>
                <span className="font-body text-xs text-white/60">{a.intensity}%</span>
              </div>
              <div className="mt-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={a.intensity}
                  onChange={(e) => window.Appearance.set({ intensity: Number(e.target.value) })}
                  className="ios-slider h-1 w-full appearance-none rounded-full bg-white/20 outline-none"
                  style={{ background: `linear-gradient(90deg, #fff 0%, #fff ${a.intensity}%, rgba(255,255,255,0.2) ${a.intensity}%, rgba(255,255,255,0.2) 100%)` }}
                />
              </div>
            </div>

            {a.filterType === "tint" && (
              <div className="liquid-glass rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <p className="font-body text-xs font-medium text-white">Hue</p>
                  <span className="h-4 w-8 rounded-full border border-white/20" style={{ background: `hsl(${a.tintHue}, 90%, 55%)` }} />
                </div>
                <div className="mt-3">
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={a.tintHue}
                    onChange={(e) => window.Appearance.set({ tintHue: Number(e.target.value) })}
                    className="ios-slider h-1 w-full appearance-none rounded-full outline-none"
                    style={{ background: `linear-gradient(90deg, hsl(0,90%,55%), hsl(60,90%,55%), hsl(120,90%,55%), hsl(180,90%,55%), hsl(240,90%,55%), hsl(300,90%,55%), hsl(360,90%,55%))` }}
                  />
                </div>
              </div>
            )}

            {/* Filter preview stripes */}
            <div className="mt-3 grid grid-cols-5 h-8 overflow-hidden rounded-full">
              <span style={{ background: "#ff3b30" }} />
              <span style={{ background: "#ffcc00" }} />
              <span style={{ background: "#34c759" }} />
              <span style={{ background: "#007aff" }} />
              <span style={{ background: "#af52de" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileSheet({ open, onClose, user }) {
  const [activeTab] = React.useState("appearance");
  function logout(){
    try { localStorage.removeItem("skillfusion_appearance_v1"); } catch(e){}
    window.Toast.show("Logged out", "success");
    setTimeout(()=> { window.Router.go("/"); onClose(); window.location.reload(); }, 600);
  }
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center md:items-center md:p-6">
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
            className="relative flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[2rem] bg-[#0a0a0a] md:rounded-[2rem] shadow-2xl border border-white/10"
          >
            <div className="flex justify-center pt-3 md:hidden">
              <span className="h-1.5 w-10 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center gap-4 p-6 pb-4">
              <Avatar handle={user?.handle} name={user?.name} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="font-heading text-xl italic leading-none text-white">{user?.name || "Guest"}</p>
                <p className="mt-1 font-body text-xs text-white/50">{user?.handle ? "@"+user.handle : "Not signed in"}</p>
              </div>
              <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/15 hover:text-white">
                <Icons.X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2 px-6">
              <span className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 font-body text-sm font-medium text-black">
                <Icons.Settings className="h-4 w-4" /> Appearance
              </span>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto px-6 pb-6">
              <AppearancePanel />
              <button type="button" onClick={logout} className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-white/10 px-6 py-3.5 font-body text-sm font-medium text-white hover:bg-white/15">
                <Icons.LogOut className="h-4 w-4" /> Log out
              </button>
              <p className="mt-3 text-center font-body text-[11px] text-white/30">Appearance settings are stored on this device.</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function AppShell({ route, children }) {
  const s = window.Store.useStore();
  const user = s.user;
  const [profileOpen, setProfileOpen] = React.useState(false);

  return (
    <div className="relative min-h-screen text-white">
      <window.AmbientBackground />
      <header className="fixed left-0 right-0 top-4 z-50 flex items-center justify-between px-6 md:px-12 lg:px-16">
        <a
          href="#/dashboard"
          aria-label="Skill Fusion dashboard"
          className="liquid-glass flex h-12 w-12 items-center justify-center rounded-full"
        >
          <span className="font-heading text-2xl italic leading-none text-white">s</span>
        </a>

        <nav
          className="liquid-glass hidden items-center gap-1 rounded-full px-1.5 py-1.5 md:flex"
          aria-label="App navigation"
        >
          {NAV.map(([label, to, icon]) => {
            const Icon = Icons[icon];
            const active = isActive(to, route);
            return (
              <a
                key={to}
                href={"#" + to}
                className={
                  (active ? "bg-white text-black" : "text-white/90 hover:text-white") +
                  " flex items-center gap-1.5 rounded-full px-3.5 py-2 font-body text-sm font-medium transition-colors"
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            );
          })}
        </nav>

        <button type="button" onClick={()=> setProfileOpen(true)} aria-label="Open profile" className="liquid-glass flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-white/10 transition-colors">
          <Avatar handle={user?.handle} name={user?.name} size="sm" />
          <span className="hidden font-body text-xs font-medium text-white sm:inline">
            {user?.name || "Guest"}
          </span>
        </button>
      </header>

      <main className="px-6 pb-28 pt-24 md:px-12 md:pb-20 lg:px-16">{children}</main>

      <nav
        className="liquid-glass-strong fixed bottom-4 left-4 right-4 z-50 flex items-center justify-around rounded-full px-2 py-2 md:hidden"
        aria-label="Mobile navigation"
      >
        {NAV.map(([label, to, icon]) => {
          const Icon = Icons[icon];
          const active = isActive(to, route);
          return (
            <a
              key={to}
              href={"#" + to}
              aria-label={label}
              className={
                (active ? "bg-white text-black" : "text-white/80") +
                " flex h-11 w-11 items-center justify-center rounded-full transition-colors"
              }
            >
              <Icon className="h-5 w-5" />
            </a>
          );
        })}
      </nav>

      <ProfileSheet open={profileOpen} onClose={()=> setProfileOpen(false)} user={user} />
      <ToastHost />
    </div>
  );
}

function ScreenPlaceholder({ route }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
      <motion.p
        initial={{ filter: "blur(6px)", opacity: 0, y: 20 }}
        animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="font-body text-sm text-white/70"
      >
        {"// " + route}
      </motion.p>
      <motion.h1
        initial={{ filter: "blur(6px)", opacity: 0, y: 24 }}
        animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
        className="mt-4 font-heading text-5xl italic leading-[1.0] tracking-[-3px] text-white md:text-6xl"
      >
        Screen coming up
      </motion.h1>
      <motion.p
        initial={{ filter: "blur(6px)", opacity: 0, y: 20 }}
        animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.25 }}
        className="mt-5 max-w-md font-body text-sm font-light text-white/60"
      >
        The scaffold and routing are live — this screen fills in as the app builds out.
      </motion.p>
    </div>
  );
}

window.AppShell = AppShell;
window.ScreenPlaceholder = ScreenPlaceholder;
