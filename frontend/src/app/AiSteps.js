const { useState, useEffect } = React;
const { motion, AnimatePresence } = window.Motion;
const { Icons } = window;

function AiSteps({ steps, speed = 1300, onDone, className = "" }) {
  const [i, setI] = useState(0);
  const done = i >= steps.length;

  useEffect(() => {
    if (i >= steps.length) return;
    const t = setTimeout(() => setI((v) => v + 1), speed);
    return () => clearTimeout(t);
  }, [i, speed, steps.length]);

  useEffect(() => {
    if (done) onDone?.();
  }, [done]);

  return (
    <div className={className}>
      {steps.map((s, idx) => {
        const state = idx < i ? "done" : idx === i ? "active" : "pending";
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, filter: "blur(8px)", y: 10 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: idx * 0.06 }}
            className={
              "flex items-start gap-4 border-b border-white/10 px-6 py-5 last:border-b-0 " +
              (state === "pending" ? "opacity-35" : "")
            }
          >
            <span
              className={
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-heading text-lg italic " +
                (state === "done"
                  ? "bg-white text-black"
                  : state === "active"
                    ? "liquid-glass-strong text-white"
                    : "text-white/40")
              }
            >
              {state === "done" ? <Icons.Check className="h-4 w-4" /> : String(idx + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <p className={"font-body text-sm font-medium " + (state === "pending" ? "text-white/50" : "text-white")}>
                {s.label}
              </p>
              <AnimatePresence>
                {state === "active" && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    aria-live="polite"
                    className="mt-1 font-body text-[13px] font-light text-white/60"
                  >
                    {s.foot}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            {state === "active" && (
              <span className="mt-2 h-2 w-2 shrink-0 animate-pulse rounded-full bg-white" />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

window.AiSteps = AiSteps;
