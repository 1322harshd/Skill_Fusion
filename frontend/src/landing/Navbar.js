const { useState, useEffect } = React;
const { motion, AnimatePresence } = window.Motion;
const { Icons } = window;

const NAV_LINKS = [
  ["Home", "#top"],
  ["How It Works", "#how-it-works"],
  ["Features", "#capabilities"],
  ["Community", "#community"],
  ["Pricing", "#pricing"],
];

function MenuIcon({ open }) {
  const bar = "absolute left-0 h-[1.5px] w-full bg-current transition-all duration-200 ease-out";
  return (
    <span className="relative block h-3.5 w-4">
      <span className={`${bar} top-0 ${open ? "top-1/2 -translate-y-1/2 rotate-45" : ""}`} />
      <span className={`${bar} top-1/2 -translate-y-1/2 ${open ? "opacity-0" : "opacity-100"}`} />
      <span className={`${bar} bottom-0 ${open ? "bottom-1/2 translate-y-1/2 -rotate-45" : ""}`} />
    </span>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed left-0 right-0 top-4 z-50 flex items-center justify-between px-8 lg:px-16">
      <a
        href="#top"
        onClick={() => setOpen(false)}
        className="liquid-glass flex h-12 w-12 items-center justify-center rounded-full"
        aria-label="Skill Fusion AI home"
      >
        <span className="font-heading text-2xl italic leading-none text-white">s</span>
      </a>

      <nav
        className="liquid-glass hidden items-center gap-1 rounded-full px-1.5 py-1.5 md:flex"
        aria-label="Main navigation"
      >
        {NAV_LINKS.map(([label, href]) => (
          <a
            key={label}
            href={href}
            className="rounded-full px-3 py-2 font-body text-sm font-medium text-white/90 transition-colors hover:text-white"
          >
            {label}
          </a>
        ))}
        <a
          href="#/onboarding"
          className="tappable ml-2 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 py-2 font-body text-sm font-medium text-black"
        >
          Start Fusing
          <Icons.ArrowUpRight className="h-4 w-4" />
        </a>
      </nav>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle navigation"
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="liquid-glass flex h-12 w-12 items-center justify-center rounded-full text-white md:hidden"
      >
        <MenuIcon open={open} />
      </button>

      <span className="invisible hidden h-12 w-12 md:block" aria-hidden="true" />

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="liquid-glass-strong fixed inset-0 z-40 flex flex-col items-center justify-center gap-2 px-8"
          >
            <span className="invisible h-12 w-12" aria-hidden="true" />
            {NAV_LINKS.map(([label, href], i) => (
              <motion.a
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 * i }}
                className="rounded-full px-6 py-3 font-body text-lg font-medium text-white/90 transition-colors hover:text-white"
              >
                {label}
              </motion.a>
            ))}
            <motion.a
              href="#/onboarding"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.3 }}
              className="tappable mt-4 flex items-center gap-2 rounded-full bg-white px-8 py-3 font-body text-sm font-medium text-black"
            >
              Start Fusing
              <Icons.ArrowUpRight className="h-4 w-4" />
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

window.Navbar = Navbar;
