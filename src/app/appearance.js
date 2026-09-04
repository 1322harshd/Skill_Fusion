const { useSyncExternalStore } = React;

const APPEARANCE_KEY = "skillfusion_appearance_v1";

const DEFAULTS = {
  textSize: 100, // 80-135 (7 steps)
  boldText: false,
  glassLevel: 0, // 0 = clear liquid, 100 = frosted
  colorFiltersEnabled: false,
  filterType: "grayscale", // grayscale | protanopia | deuteranopia | tritanopia | tint
  intensity: 80, // 0-100
  tintHue: 40, // 0-360 for tint
};

const FILTER_LABELS = {
  grayscale: "Grayscale",
  protanopia: "Red/Green Filter",
  deuteranopia: "Green/Red Filter",
  tritanopia: "Blue/Yellow Filter",
  tint: "Color Tint",
};

const FILTER_DESCS = {
  grayscale: "Grayscale",
  protanopia: "Protanopia",
  deuteranopia: "Deuteranopia",
  tritanopia: "Tritanopia",
  tint: "Tint with hue",
};

function load() {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) {}
  return { ...DEFAULTS };
}

let state = load();
const listeners = new Set();

function persist() {
  try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(state)); } catch(e){}
}

function emit(){ listeners.forEach(fn=>fn()); }

function subscribe(fn){ listeners.add(fn); return ()=> listeners.delete(fn); }
function getSnapshot(){ return state; }

function set(patch){
  state = { ...state, ...patch };
  persist();
  apply();
  emit();
}

function reset(){
  state = { ...DEFAULTS };
  persist();
  apply();
  emit();
}

function apply(){
  const s = state;
  const root = document.documentElement;
  const body = document.body;
  // Text size — scale text only, not layout (html stays 16px, we scale text utilities via --text-scale)
  const scale = s.textSize / 100;
  root.style.setProperty("--text-scale", scale);
  root.style.fontSize = ""; // keep html 16px fixed to avoid zooming layout (was s.textSize+"%" which zoomed)
  // Bold text — toggle weight + antialias
  if (s.boldText) {
    root.classList.add("appearance-bold");
  } else {
    root.classList.remove("appearance-bold");
  }
  // Glass level — 0 = exact original Clear (html before appearance), 100 = Frosted
  // Original html: .liquid-glass blur 4px / rgba 0.01, .liquid-glass-strong blur 50px / rgba 0.01, --glass-strong var 0.04
  const blur = 4 + (s.glassLevel / 100) * 12; // 4 -> 16 (subtle, keeps Clear as before)
  const strongBlur = 50 + (s.glassLevel / 100) * 6; // 50 -> 56 (already frosted at Clear, just a touch more)
  const opacity = 0.01 + (s.glassLevel / 100) * 0.09; // 0.01 -> 0.10
  const strongOpacity = 0.01 + (s.glassLevel / 100) * 0.13; // 0.01 -> 0.14 (was 0.01 at Clear, now frosted)
  root.style.setProperty("--glass-blur", blur + "px");
  root.style.setProperty("--glass-strong-blur", strongBlur + "px");
  root.style.setProperty("--glass-surface", `rgba(255,255,255,${opacity})`);
  root.style.setProperty("--glass-strong", `rgba(255,255,255,${strongOpacity})`);
  // Update actual CSS via style tag override (fallback if variables not used)
  let styleEl = document.getElementById("appearance-glass-style");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "appearance-glass-style";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    :root { --text-scale: ${scale}; }
    /* Text-only scaling — overrides Tailwind text utilities so layout (padding/margin/gap which are rem) stays fixed, only type grows */
    .text-xs { font-size: calc(0.75rem * var(--text-scale)) !important; }
    .text-sm { font-size: calc(0.875rem * var(--text-scale)) !important; }
    .text-base { font-size: calc(1rem * var(--text-scale)) !important; }
    .text-lg { font-size: calc(1.125rem * var(--text-scale)) !important; }
    .text-xl { font-size: calc(1.25rem * var(--text-scale)) !important; }
    .text-2xl { font-size: calc(1.5rem * var(--text-scale)) !important; }
    .text-3xl { font-size: calc(1.875rem * var(--text-scale)) !important; }
    .text-4xl { font-size: calc(2.25rem * var(--text-scale)) !important; }
    .text-5xl { font-size: calc(3rem * var(--text-scale)) !important; }
    .text-6xl { font-size: calc(3.75rem * var(--text-scale)) !important; }
    .text-7xl { font-size: calc(4.5rem * var(--text-scale)) !important; }
    .text-\\[10px\\] { font-size: calc(10px * var(--text-scale)) !important; }
    .text-\\[11px\\] { font-size: calc(11px * var(--text-scale)) !important; }
    .text-\\[12px\\] { font-size: calc(12px * var(--text-scale)) !important; }
    .text-\\[13px\\] { font-size: calc(13px * var(--text-scale)) !important; }
    .text-\\[14px\\] { font-size: calc(14px * var(--text-scale)) !important; }
    .text-\\[15px\\] { font-size: calc(15px * var(--text-scale)) !important; }
    .liquid-glass { backdrop-filter: blur(${blur}px) !important; -webkit-backdrop-filter: blur(${blur}px) !important; background: rgba(255,255,255,${opacity}) !important; }
    .liquid-glass-strong { backdrop-filter: blur(${strongBlur}px) !important; -webkit-backdrop-filter: blur(${strongBlur}px) !important; background: rgba(255,255,255,${strongOpacity}) !important; }
    .appearance-bold .font-body { font-weight: 700 !important; }
    .appearance-bold .font-heading { font-weight: 700 !important; }
    .appearance-bold .font-body, .appearance-bold .font-heading { font-synthesis-weight: none; }
    .appearance-bold * { -webkit-font-smoothing: antialiased; }
  `;

  // Color filters applied to html
  // intensity 0-100 controls strength via opacity of overlay or filter
  let filter = "none";
  if (s.colorFiltersEnabled) {
    const i = s.intensity / 100;
    switch (s.filterType) {
      case "grayscale":
        filter = `grayscale(${i})`;
        break;
      case "protanopia":
        // Red/Green filter approx
        filter = `contrast(${0.9 + i*0.2}) sepia(${i*0.35}) saturate(${0.7 + i*0.5}) hue-rotate(${-10*i}deg)`;
        break;
      case "deuteranopia":
        filter = `contrast(${0.9 + i*0.2}) sepia(${i*0.25}) saturate(${0.6 + i*0.6}) hue-rotate(${8*i}deg)`;
        break;
      case "tritanopia":
        filter = `contrast(${0.95 + i*0.15}) sepia(${i*0.2}) saturate(${0.7 + i*0.5}) hue-rotate(${45*i}deg)`;
        break;
      case "tint":
        // tint via overlay handled separately, filter for intensity
        filter = `sepia(${i*0.45}) saturate(${1 + i*0.6}) hue-rotate(${s.tintHue}deg)`;
        break;
      default: filter = "none";
    }
  }
  root.style.filter = filter;
  // Tint overlay for Color Tint type
  let tintEl = document.getElementById("appearance-tint-overlay");
  if (s.colorFiltersEnabled && s.filterType === "tint") {
    if (!tintEl) {
      tintEl = document.createElement("div");
      tintEl.id = "appearance-tint-overlay";
      tintEl.style.position = "fixed";
      tintEl.style.inset = "0";
      tintEl.style.pointerEvents = "none";
      tintEl.style.zIndex = "9998";
      document.body.appendChild(tintEl);
    }
    const alpha = (s.intensity / 100) * 0.18;
    tintEl.style.background = `hsla(${s.tintHue}, 90%, 50%, ${alpha})`;
    tintEl.style.mixBlendMode = "color";
  } else if (tintEl) {
    tintEl.remove();
  }
}

// Apply on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", apply);
} else {
  apply();
}

window.Appearance = {
  DEFAULTS,
  FILTER_LABELS,
  FILTER_DESCS,
  subscribe,
  getSnapshot,
  useStore: () => useSyncExternalStore(subscribe, getSnapshot),
  set,
  reset,
  apply,
};
