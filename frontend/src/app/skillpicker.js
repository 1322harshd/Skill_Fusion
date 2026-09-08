const { useState } = React;
const { AnimatePresence, motion } = window.Motion;
const { Icons } = window;
const F = window.Fusion;

function SkillPicker({ mode = "single", value, onChange, label, placeholder, className = "" }) {
  const [openDomain, setOpenDomain] = useState(null);

  const selected = mode === "multi" ? (Array.isArray(value) ? value : []) : value || "";

  function isSelected(skill) {
    return mode === "multi" ? selected.includes(skill) : selected === skill;
  }

  function pick(skill) {
    if (mode === "multi") {
      onChange(isSelected(skill) ? selected.filter((s) => s !== skill) : [...selected, skill]);
    } else {
      onChange(skill);
      setOpenDomain(null);
    }
  }

  function remove(skill) {
    if (mode === "multi") onChange(selected.filter((s) => s !== skill));
    else onChange("");
  }

  const chips = mode === "multi" ? selected : selected ? [selected] : [];

  return (
    <div className={`liquid-glass-strong w-full rounded-2xl p-4 ${className}`}>
      {label && (
        <p className="mb-3 font-body text-[11px] uppercase tracking-[0.18em] text-white/50">{label}</p>
      )}

      {chips.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {chips.map((skill) => (
            <span
              key={skill}
              className="inline-flex select-none items-center gap-1.5 rounded-full px-3 py-1 font-body text-sm font-semibold text-black"
              style={{ background: F.colorOf(skill) }}
            >
              {skill}
              <button
                type="button"
                onClick={() => remove(skill)}
                className="tappable flex h-4 w-4 items-center justify-center rounded-full bg-black/15 text-black transition-colors hover:bg-black/30"
                aria-label={`Remove ${skill}`}
              >
                <Icons.X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mb-3 font-body text-sm font-light text-white/40">{placeholder}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {F.DOMAINS.map((domain) => {
          const active = openDomain === domain.id;
          const hasPick = mode === "multi" ? selected.some((s) => domain.skills.includes(s)) : domain.skills.includes(selected);
          return (
            <button
              key={domain.id}
              type="button"
              onClick={() => setOpenDomain(active ? null : domain.id)}
              id={"skill-domain-btn-" + domain.id}
              aria-expanded={active}
              aria-controls={"skill-domain-" + domain.id}
              className={
                (active ? "text-black" : hasPick ? "text-white" : "liquid-glass text-white/75 hover:text-white") +
                " tappable flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs font-semibold tracking-wide transition-colors"
              }
              style={active ? { background: domain.color } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: domain.color }} />
              {domain.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {openDomain &&
          (() => {
            const domain = F.DOMAINS.find((d) => d.id === openDomain);
            return (
              <motion.div
                key={openDomain}
                id={"skill-domain-" + openDomain}
                role="region"
                aria-label={domain.label + " skills"}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex flex-wrap gap-2 rounded-[var(--radius-md)] border border-white/10 bg-black/25 p-3">
                  {domain.skills.map((skill) => {
                    const sel = isSelected(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => pick(skill)}
                        role={mode === "single" ? "radio" : "checkbox"}
                        aria-checked={sel}
                        className={
                          (sel ? "text-black" : "liquid-glass text-white/85 hover:text-white") +
                          " tappable inline-flex select-none items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs font-semibold transition-colors"
                        }
                        style={sel ? { background: F.colorOf(skill) } : undefined}
                      >
                        {sel && <Icons.Check className="h-3 w-3" />}
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })()}
      </AnimatePresence>
    </div>
  );
}

window.SkillPicker = SkillPicker;
