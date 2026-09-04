const { useId } = React;
const { motion } = window.Motion;
const { Icons } = window;
const F = window.Fusion;

function VerifiedBadge({ verified = true, label, className = "" }) {
  if (verified) {
    return (
      <span
        className={
          "inline-flex select-none items-center gap-1 rounded-full bg-white px-2.5 py-0.5 font-body text-[11px] font-semibold tracking-wide text-black " +
          className
        }
      >
        <Icons.Check className="h-3 w-3" />
        {label || "Verified"}
      </span>
    );
  }
  return (
    <span
      className={
        "liquid-glass inline-flex select-none items-center rounded-full px-2.5 py-0.5 font-body text-[11px] font-medium tracking-wide text-white " +
        className
      }
    >
      {label || "Self-reported"}
    </span>
  );
}

function SkillTag({ name, kind = "technical", color, className = "" }) {
  const c = color || F.colorOf(name);
  if (kind === "technical") {
    return (
      <span
        className={
          "liquid-glass inline-flex select-none items-center rounded-full py-0.5 pl-2.5 pr-2.5 font-body text-[11px] text-white/90 " +
          className
        }
        style={{ borderLeft: "2px solid " + c }}
      >
        {name}
      </span>
    );
  }
  return (
    <span
      className={
        "liquid-glass inline-flex select-none items-center rounded-full px-2.5 py-0.5 font-heading text-[11px] italic tracking-wide text-white/90 " +
        className
      }
    >
      {name}
    </span>
  );
}

function FusionGauge({ value = 0, a, b, size = 176, strokeWidth = 10, label, className = "" }) {
  const [ca, cb] = F.colors(a, b);
  const rawId = useId();
  const gid = "fg" + rawId.replace(/[^a-zA-Z0-9]/g, "");
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const off = c * (1 - pct / 100);
  return (
    <div
      className={"relative inline-flex shrink-0 items-center justify-center " + className}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={"0 0 " + size + " " + size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={ca} />
            <stop offset="100%" stopColor={cb} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={"url(#" + gid + ")"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-5xl italic leading-none tracking-[-2px] text-white">
          {Math.round(pct)}
        </span>
        {label && (
          <span className="mt-1.5 font-body text-[10px] font-medium uppercase tracking-[0.22em] text-white/50">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

function CountdownRing({ frac = 1, color = "#ffffff", size = 24, strokeWidth = 3, className = "" }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, frac));
  return (
    <svg width={size} height={size} viewBox={"0 0 " + size + " " + size} className={"shrink-0 " + className}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - f)}
        transform={"rotate(-90 " + size / 2 + " " + size / 2 + ")"}
      />
    </svg>
  );
}

const SIDEBAR_NAV = [
  ["Fusion Insights", "Sparkles", "/fuse"],
  ["Roadmap", "MapLine", "/roadmaps"],
  ["Project Brief", "Doc", "/projects"],
  ["Fusion Score", "Activity", "/score"],
];

function FusionSidebar({ fusion, route, className = "" }) {
  const f = fusion || {};
  const items = SIDEBAR_NAV.map(([label, icon, base]) => {
    const Icon = Icons[icon];
    const active = base === "/fuse" ? route === "/fuse" : route === base || route.startsWith(base + "/");
    const href = base === "/fuse" ? "#/fuse" : "#" + base + "/" + f.id;
    return (
      <a
        key={base}
        href={href}
        className={
          (active
            ? "liquid-glass text-white"
            : "text-white/60 hover:text-white") +
          " flex items-center gap-2.5 rounded-full px-3.5 py-2.5 font-body text-sm font-medium transition-colors"
        }
      >
        <Icon className="h-4 w-4" />
        {label}
      </a>
    );
  });

  return (
    <motion.aside
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={"liquid-glass flex flex-col gap-1 rounded-[1.25rem] p-4 " + className}
    >
      <div className="px-1 pb-3">
        <p className="font-body text-[10px] font-medium uppercase tracking-[0.24em] text-white/40">Active fusion</p>
        <p className="mt-1 truncate font-heading text-xl italic leading-tight tracking-[-1px] text-white">
          {f.a} × {f.b}
        </p>
      </div>
      <div className="flex flex-col gap-1">{items}</div>
    </motion.aside>
  );
}

window.VerifiedBadge = VerifiedBadge;
window.SkillTag = SkillTag;
window.FusionGauge = FusionGauge;
window.CountdownRing = CountdownRing;
window.FusionSidebar = FusionSidebar;
