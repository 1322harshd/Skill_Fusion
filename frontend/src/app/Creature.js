// Your Fusion as a Living Creature (WOW #9).
// Every fused pair renders as a deterministic procedurally-generated SVG
// "chimera": the same pair always regenerates the same creature, each skill
// category contributes a body-part vocabulary (tech → circuit spine,
// creative → flame crest, science → orbit ring, everyday → leafy sprout…),
// and the palette is the pair's own fusion gradient. The creature EVOLVES
// with the Fusion Score: Spark → Ember → Forge → Mythic (legs, sparkles,
// aura, planets, stardust, halo appear as the score crosses thresholds) —
// it is a living report card, not a sticker.
//
// Pure frontend, zero backend: geometry is seeded by hashing the skill
// names through window.Fusion.hash (the same hash that categories use), so
// a creature is stable across devices, reloads and logins.
const { useMemo } = React;
const { motion } = window.Motion;
const F = window.Fusion;

window.Creature = (function () {

  function mulberry32(seed) {
    // Fast deterministic PRNG; creature geometry only, so 32 bits is plenty.
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6d2b79f5) >>> 0;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function esc(s) {
    // Skill names are user-typed; the only place they enter the SVG is the
    // accessibility <title>, and even there they get escaped.
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ---- evolution stages (score 1..100) ---------------------------------
  const STAGES = [
    { at: 0, name: "Spark", note: "just hatched" },
    { at: 25, name: "Ember", note: "legs sprouted, sparkles" },
    { at: 50, name: "Forge", note: "aura ignited, third eye opens" },
    { at: 75, name: "Mythic", note: "halo, planets, stardust trail" },
  ];

  function stageOf(score) {
    const v = Math.max(1, Math.min(100, Math.round((score && score.value) || 0)));
    let idx = 0;
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if (v >= STAGES[i].at) { idx = i; break; }
    }
    return { ...STAGES[idx], idx, score: v };
  }

  // ---- per-category body-part vocabulary -------------------------------
  // Each returns an SVG fragment drawn around the creature's body
  // (center ~60,74; head bump at ~60,54). Called once per input skill so a
  // same-category pair wears the same feature twice, at different jitter.
  const PARTS = {
    tech(r, [c1, c2]) {
      // circuit spine down the left flank
      const x0 = 41 + r() * 3, y0 = 88 - r() * 4, y1 = 56 + r() * 4;
      const bx = x0 - 3 + r() * 2;
      return `<g>
        <polyline points="${x0},${y0} ${bx},${y0 - 12} ${bx + 3},${(y0 + y1) / 2} ${bx + 1},${y1}" fill="none" stroke="${c2}" stroke-width="1.6" stroke-linejoin="round"/>
        <rect x="${bx - 2.5}" y="${y0 - 14.5}" width="5" height="5" rx="1" fill="${c2}"/>
        <rect x="${bx - 2.5}" y="${y1 - 2}" width="5" height="5" rx="1" fill="${c2}"/>
        <circle cx="${x0 + 6}" cy="${(y0 + y1) / 2}" r="1.8" fill="${c1}" stroke="#fff" stroke-opacity="0.5" stroke-width="0.5"/>
      </g>`;
    },
    creative(r, [c1, c2]) {
      // flame crest on the head
      const h = 14 + r() * 8, w = 5 + r() * 3, cx = 60;
      const p = (dx, s) => `M ${cx + dx} 53 C ${cx + dx - w * s} ${53 - h * 0.55 * s}, ${cx + dx - w * s} ${53 - h * 0.85 * s}, ${cx + dx} ${53 - h * s} C ${cx + dx + w * s} ${53 - h * 0.85 * s}, ${cx + dx + w * s} ${53 - h * 0.55 * s}, ${cx + dx} 53 Z`;
      return `<g>
        <path d="${p(-w * 1.6, 0.6)}" fill="${c2}" opacity="0.75"/>
        <path d="${p(0, 1)}" fill="${c1}"/>
        <path d="${p(w * 1.6, 0.5)}" fill="${c2}" opacity="0.55"/>
      </g>`;
    },
    business(r, [c1, c2]) {
      // coin pattern on the right flank + monocle on one eye
      const bx = 72 + r() * 5, by = 70 + r() * 6;
      let coins = "";
      for (let i = 0; i < 3; i++) coins += `<circle cx="${bx + i * 6.5}" cy="${by - i * 5}" r="3.2" fill="none" stroke="${c2}" stroke-width="1.2" stroke-opacity="${0.9 - i * 0.2}"/>`;
      return `<g>${coins}
        <circle cx="52" cy="64" r="6.2" fill="none" stroke="${c2}" stroke-width="1.1" opacity="0.8"/>
        <line x1="52" y1="70.2" x2="52" y2="78" stroke="${c2}" stroke-width="1" opacity="0.6"/>
      </g>`;
    },
    science(r, [c1, c2], s) {
      // orbital ring around the whole creature + a satellite dot
      const rot = -22 - (r() * 20);
      const rx = 44 + r() * 4, ry = 12 + r() * 3;
      const ang = r() * 6.28, px = 60 + Math.cos(ang) * rx * 0.98, py = 74 + Math.sin(ang) * ry * 0.98;
      return `<g transform="rotate(${rot} 60 74)">
        <ellipse cx="60" cy="74" rx="${rx}" ry="${ry}" fill="none" stroke="${c2}" stroke-width="1" stroke-dasharray="3 4" opacity="0.7"/>
        <circle cx="${px}" cy="${py}" r="2.4" fill="${c1}"/>
        ${s >= 3 ? `<ellipse cx="60" cy="74" rx="${rx + 12}" ry="${ry + 6}" fill="none" stroke="${c2}" stroke-width="0.6" stroke-dasharray="2 5" opacity="0.4"/>` : ""}
      </g>`;
    },
    comm(r, [c1, c2]) {
      // speech-bubble tail + sound arcs at the mouth end
      const fx = 86, fy = 70 - r() * 6;
      return `<g>
        <path d="M ${fx - 4} ${fy} l 9 ${3 + r() * 2} l -8 ${5}" fill="${c1}" stroke="none"/>
        <path d="M ${fx + 2} ${fy - 8} q 5 6 0 12" fill="none" stroke="${c2}" stroke-width="1.2" stroke-linecap="round" opacity="0.85"/>
        <path d="M ${fx + 7} ${fy - 11} q 7 9 0 18" fill="none" stroke="${c2}" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
      </g>`;
    },
    everyday(r, [c1, c2]) {
      // leafy sprout from the crown
      const sway = (r() - 0.5) * 6;
      return `<g>
        <path d="M 60 52 C ${60 + sway * 0.4} 46, ${60 + sway} 42, ${60 + sway} 37" fill="none" stroke="${c2}" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M ${60 + sway} 40 c -6 -5 -7 -10 -1 -11 c 6 1 5 7 1 11 z" fill="${c1}"/>
        <path d="M ${60 + sway} 44 c 5 -4 6 -8 1 -9 c -4 1 -4 5 -1 9 z" fill="${c2}" opacity="0.85"/>
      </g>`;
    },
    wellness(r, [c1, c2]) {
      // ribcage arches on the left flank + a breath-star glint
      const x0 = 46, y0 = 92 - r() * 5;
      return `<g>
        <path d="M ${x0} ${y0 - 16} q 9 8 1 16" fill="none" stroke="${c2}" stroke-width="1.3" stroke-linecap="round" opacity="0.9"/>
        <path d="M ${x0 - 4} ${y0 - 11} q 7 6 1 12" fill="none" stroke="${c2}" stroke-width="1.1" opacity="0.65"/>
        <path d="M 76 84 l 2 4 M 80 82 l 1 4" stroke="#fff" stroke-opacity="0.5" stroke-width="1" stroke-linecap="round"/>
      </g>`;
    },
    craft(r, [c1, c2]) {
      // riveted segment patches on the body
      const dx = 52 + r() * 8, dy = 82 + r() * 4;
      const patch = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="6.5" rx="2.5" fill="${c2}" opacity="0.5"/>
        <circle cx="${x + w / 2}" cy="${y + 3.2}" r="1.1" fill="#fff" opacity="0.65"/>`;
      return `<g>
        ${patch(dx, dy, 13)}${patch(dx + 5, dy - 8.5, 10)}
      </g>`;
    },
  };

  function hexEye(cx, cy, rad, fill) {
    let pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(" ")}" fill="${fill}"/>`;
  }

  function eyes(r, colors, stage) {
    // 1–2 eyes above Forge; Forge opens a third, hex-shaped crown eye
    const dark = "#0b1020";
    let out = "";
    if (stage >= 2) {
      out += `<circle cx="52" cy="64" r="4.6" fill="${dark}"/>
              <circle cx="51.2" cy="62.7" r="1.4" fill="#fff" opacity="0.9"/>
              <circle cx="68" cy="64" r="4.6" fill="${dark}"/>
              <circle cx="67.2" cy="62.7" r="1.4" fill="#fff" opacity="0.9"/>
              ${hexEye(60, 58.5, 3.1, dark)}
              <circle cx="60" cy="57.6" r="0.9" fill="#fff" opacity="0.85"/>`;
      return out;
    }
    const n = 1 + Math.floor(r() * 2);
    const spots = n === 1 ? [[60, 65, 5.4]] : [[52, 64, 4.6], [68, 64, 4.6]];
    for (const [x, y, rad] of spots) {
      out += `<circle cx="${x}" cy="${y}" r="${rad}" fill="${dark}"/>
              <circle cx="${x - rad * 0.3}" cy="${y - rad * 0.35}" r="${(rad * 0.28).toFixed(2)}" fill="#fff" opacity="0.9"/>`;
    }
    return out;
  }

  // ---- assembly ----------------------------------------------------------
  function chimera(a, b, score, opts = {}) {
    // uid is pair(-or-trio)-derived, not a call counter: the same skill set
    // regenerates byte-identical SVG (across devices, reloads, logins). Two
    // creatures of the SAME set on one page share a gradient id — but by
    // definition an identical gradient, so rendering is still correct.
    const third = opts.third && opts.third !== a && opts.third !== b ? opts.third : null;
    // canonical (order-insensitive) skill set drives uid + seed: rendering the
    // same creature in any display order regenerates the identical SVG
    const canonical = [a, b, third].filter(Boolean).sort((x, y) => x.toLowerCase() < y.toLowerCase() ? -1 : 1);
    const uid = `cg${F.hash(canonical.join("|"))}${opts.salt || ""}`;
    const seed = F.hash(canonical.join("×") + "|creature");
    const r = mulberry32(seed);
    const [c1, c2] = F.colors(a, b);
    const c3 = third ? F.colorOf(third) : null;
    const stage = stageOf(score);
    const catA = F.categoryOf(a);
    const catB = F.categoryOf(b);
    const catC = third ? F.categoryOf(third) : null;
    const blobRy = 19 + r() * 3;
    const blobRx = 25 + r() * 4;

    const partFor = (cat, rr) => (PARTS[cat] || PARTS.tech)(rr, [c1, c2], stage.idx);

    let extras = "";
    // Ember: sparkles
    if (stage.idx >= 1) {
      for (let i = 0; i < 2; i++) {
        const x = 18 + r() * 84, y = 14 + r() * 22, s = 1.6 + r();
        extras += `<path d="M ${x - s} ${y} L ${x + s} ${y} M ${x} ${y - s} L ${x} ${y + s}" stroke="#fff" stroke-opacity="0.8" stroke-width="0.9" stroke-linecap="round"/>`;
      }
    }
    // Forge: stardust trail
    if (stage.idx >= 2) {
      for (let i = 0; i < 5; i++) {
        const x = 12 + r() * 96, y = 8 + r() * 30;
        extras += `<circle cx="${x}" cy="${y}" r="${(0.7 + r() * 1.1).toFixed(1)}" fill="${i % 2 ? c2 : "#fff"}" opacity="${(0.3 + r() * 0.5).toFixed(2)}"/>`;
      }
    }
    // Mythic: halo + twin planets on the orbit handled in science part (s>=3);
    // creatures never leaves home without the halo
    if (stage.idx >= 3) {
      extras += `<ellipse cx="60" cy="24" rx="15" ry="4" fill="none" stroke="#FFD970" stroke-width="1.2" opacity="0.9"/>
                 <ellipse cx="60" cy="24" rx="21" ry="6" fill="none" stroke="#FFD970" stroke-width="0.6" opacity="0.45"/>`;
    }

    const legs = stage.idx >= 1
      ? `<ellipse cx="52" cy="98" rx="4" ry="6.5" fill="${c1}"/>
         <ellipse cx="68" cy="98" rx="4" ry="6.5" fill="${c2}"/>`
      : "";

    // Trio: the third skill wears its category part at independent jitter,
    // and the legs pick up its color as a third foot.
    const thirdPart = third
      ? (PARTS[catC] || PARTS.tech)(mulberry32((seed >>> 5) | 0x2545f491), [c3, c2], stage.idx)
      : "";
    const thirdLeg = third && stage.idx >= 1 ? `<ellipse cx="60" cy="100" rx="3.4" ry="5.5" fill="${c3}"/>` : "";

    return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img"
        aria-label="${esc(`Fusion creature for ${canonical.join(" × ")}, ${stage.name} stage`)}">
      <defs>
        <linearGradient id="${uid}-g" x1="0" y1="0" x2="1" y2="1">
          ${third ? `<stop offset="0%" stop-color="${c1}"/>
          <stop offset="50%" stop-color="${c3}"/>
          <stop offset="100%" stop-color="${c2}"/>`
          : `<stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>`}
        </linearGradient>
        <radialGradient id="${uid}-a">
          <stop offset="0%" stop-color="${third || c2}" stop-opacity="${stage.idx >= 2 ? 0.3 : 0.16}"/>
          <stop offset="100%" stop-color="${third || c2}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="60" cy="72" r="46" fill="url(#${uid}-a)"/>
      ${partFor(catA, mulberry32(seed >> 1))}
      ${stage.idx >= 2 ? partFor("science", mulberry32(seed << 1), stage.idx) : ""}
      ${legs}${thirdLeg}
      <ellipse cx="60" cy="76" rx="${blobRx}" ry="${blobRy}" fill="url(#${uid}-g)"/>
      <ellipse cx="60" cy="57" rx="16.5" ry="13" fill="url(#${uid}-g)"/>
      <ellipse cx="60" cy="83" rx="13" ry="7" fill="#fff" opacity="0.12"/>
      ${eyes(mulberry32(seed >> 3), [c1, c2], stage.idx)}
      ${partFor(catB === catA ? "creative" : catB, mulberry32(seed ^ 0x9e3779b9), stage.idx)}
      ${thirdPart}
      ${extras}
    </svg>`;
  }

  // ---- React view --------------------------------------------------------
  function CreatureView({ a, b, score, className = "", size = 120, caption = false, third = null, lineage = null }) {
    const { svg, stage } = useMemo(() => {
      const stage = stageOf(score);
      return { svg: chimera(a, b, score, { third }), stage };
    }, [a, b, third, score && score.value]);
    return (
      <motion.div
        className={"flex select-none flex-col items-center " + className}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.6 + (F.hash(String(a) + String(b) + String(third || "")) % 10) / 10, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="creature-art"
          style={{ width: size, height: size }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {caption && (
          <p className="mt-1 font-body text-[11px] uppercase tracking-[0.18em] text-white/45">
            {stage.name}-stage creature · {stage.note}
          </p>
        )}
        {lineage && (
          <p className="mt-0.5 font-body text-[10px] font-light italic text-white/35">
            evolved from {lineage}
          </p>
        )}
      </motion.div>
    );
  }

  return { chimera, stageOf, CreatureView, STAGES };
})();
