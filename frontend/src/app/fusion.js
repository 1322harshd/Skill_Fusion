const { useMemo } = React;

window.Fusion = (function () {
  const CATEGORY_COLORS = {
    tech: "#3FB6C6",
    creative: "#D96C92",
    business: "#CDA62F",
    science: "#52A970",
    comm: "#7D84CE",
    everyday: "#E6884E",
    wellness: "#8BC94B",
    craft: "#A0724A",
  };

  // Publish the palette as CSS custom properties so components can use
  // var(--color-*) and the :root block in index.html stays in sync.
  try {
    const root = document.documentElement;
    for (const [cat, hex] of Object.entries(CATEGORY_COLORS)) {
      root.style.setProperty("--color-" + cat, hex);
    }
  } catch (e) {}

  const CATEGORY_LABELS = {
    tech: "Technical",
    creative: "Creative",
    business: "Business",
    science: "Scientific",
    comm: "Communicative",
    everyday: "Everyday & Home",
    wellness: "Health & Fitness",
    craft: "Crafts & Trades",
  };

  const CATEGORY_ORDER = ["tech", "creative", "business", "science", "comm", "everyday", "wellness", "craft"];

  const RULES = [
    [/cook|bak|meal|garden|organiz|interior|pet\b|first aid|mend|houseplant/i, "everyday"],
    [/yoga|fit\b|fitness|run\b|running|swim|danc|nutrit|meditat|martial|box|strength|workout|hik/i, "wellness"],
    [/woodwork|metalwork|pottery|jewelr|leather|mechanic|bike|3d print|woodwork|weld|carp|\bdiy\b|repair/i, "craft"],
    [/code|progr|dev|engineer|ai\b|ml\b|data|sql|cloud|cyber|api|soft|back-end|backend|front|python|react|automation|security|hardware|analytics/i, "tech"],
    [/design|illust|art|photo|video|anim|ui\b|ux\b|brand|content|music|sound|fashion|motion|podcast|act\b|acting/i, "creative"],
    [/market|sales|business|finance|startup|product|strateg|operat|manage|entrepreneur|growth|pricing|account|negotiat|ecom/i, "business"],
    [/scien|math|research|bio|phys|chem|stat|lab|psych|neurosci|astronomy|climat|environment/i, "science"],
    [/communi|present|teach|coach|public|social|story|editor|copy|language|speak|writing|comedy/i, "comm"],
  ];

  const FALLBACK_ACCENTS = ["#8A5CF6", "#E88F3D", "#4FB98A", "#E05A7A", "#3FA3D9"];

  const DOMAINS = CATEGORY_ORDER.map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
    color: CATEGORY_COLORS[id],
    skills:
      id === "tech"
        ? ["Web Dev", "Frontend", "Backend", "Python", "JavaScript", "APIs", "Cloud", "ML", "SQL", "Framer Motion", "Cybersecurity", "Game Dev", "Prompt Engineering", "No-Code Tools"]
        : id === "creative"
          ? ["UI Design", "UX Research", "Branding", "Illustration", "Graphic Design", "Motion & 3D", "Sound Design", "Photography", "Video Editing", "Music Production", "Podcasting", "Acting", "Fashion Design"]
          : id === "business"
          ? ["Marketing", "Growth", "Product Management", "Strategy", "Finance", "Operations", "Sales", "Entrepreneurship", "Accounting", "HR & People Ops", "Negotiation"]
          : id === "science"
          ? ["Data Science", "Statistics", "Research", "Psychology", "Math", "Physics", "Biology", "Astronomy", "Climate & Environment", "Neuroscience"]
          : id === "comm"
          ? ["Writing", "Copywriting", "Editing", "Storytelling", "Public Speaking", "Teaching", "Social Media", "Stand-up Comedy", "Event Hosting", "Sign Language", "Language Learning"]
          : id === "everyday"
          ? ["Cooking", "Baking", "Meal Planning", "Gardening", "Home Organization", "Interior Styling", "Sewing & Mending", "Pet Care", "First Aid"]
          : id === "wellness"
          ? ["Strength Training", "Yoga", "Running", "Swimming", "Dance", "Nutrition", "Meditation", "Martial Arts", "Boxing", "Hiking"]
          : ["Woodworking", "Metalwork", "3D Printing", "Electronics", "Auto Mechanics", "Pottery", "Jewelry Making", "Leatherwork", "Bike Repair"],
  }));

  function allSkills() {
    return DOMAINS.flatMap((d) => d.skills);
  }

  function skillDomain(skill) {
    return DOMAINS.find((d) => d.skills.includes(skill)) || null;
  }

  function hash(str) {
    let h = 0;
    for (let i = 0; i < String(str || "").length; i++) h = (h * 31 + String(str).charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function categoryOf(name) {
    const dom = DOMAINS.find((d) => d.skills.includes(String(name || "")));
    if (dom) return dom.id;
    for (const [re, cat] of RULES) if (re.test(String(name || ""))) return cat;
    return CATEGORY_ORDER[hash(name) % CATEGORY_ORDER.length];
  }

  function colorOf(name) {
    return CATEGORY_COLORS[categoryOf(name)];
  }

  function colors(a, b) {
    let ca = colorOf(a);
    let cb = colorOf(b);
    if (ca === cb) cb = FALLBACK_ACCENTS[hash(String(a) + "×" + String(b)) % FALLBACK_ACCENTS.length];
    return [ca, cb];
  }

  function hexA(hex, alpha) {
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
      .toString(16)
      .padStart(2, "0");
    return hex + a;
  }

  function gradStyle(a, b, deg = 135) {
    const [ca, cb] = colors(a, b);
    return { background: `linear-gradient(${deg}deg, ${ca}, ${cb})` };
  }

  function tintStyle(a, b, alpha = 0.08, deg = 135) {
    const [ca, cb] = colors(a, b);
    return { background: `linear-gradient(${deg}deg, ${hexA(ca, alpha)}, ${hexA(cb, alpha)})` };
  }

  function ringStyle(frac, a, b) {
    const [ca, cb] = colors(a, b);
    const track = "rgba(255,255,255,0.09)";
    return {
      background: `conic-gradient(${ca} 0%, ${cb} ${Math.round(frac * 100)}%, ${track} ${Math.round(frac * 100)}% 100%)`,
    };
  }

  function FusionChip({ a, b, className = "", size = "md" }) {
    const style = useMemo(() => gradStyle(a, b), [a, b]);
    const sizes = {
      sm: "px-2 py-0.5 text-[10px]",
      md: "px-2.5 py-1 text-[11px]",
      lg: "px-3.5 py-1.5 text-[13px]",
    };
    return (
      <span
        className={`inline-flex select-none items-center gap-1 rounded-full font-body font-semibold tracking-wide text-black ${sizes[size]} ${className}`}
        style={style}
      >
        <span className="opacity-90">{a}</span>
        <span className="text-black/50">×</span>
        <span className="opacity-90">{b}</span>
      </span>
    );
  }

  function FusionOrb({ a, b, className = "", children }) {
    const [ca, cb] = colors(a || "Skill A", b || "Skill B");
    const style = useMemo(() => {
      if (a && b) return { background: `linear-gradient(135deg, ${ca}, ${cb})` };
      if (a) return { background: `linear-gradient(135deg, ${ca}, ${hexA(ca, 0.35)})` };
      return { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)" };
    }, [a, b, ca, cb]);
    return (
      <div
        className={`flex select-none items-center justify-center rounded-full font-heading italic text-black ${className}`}
        style={style}
      >
        {children}
      </div>
    );
  }

  return {
    CATEGORY_COLORS,
    CATEGORY_LABELS,
    CATEGORY_ORDER,
    DOMAINS,
    allSkills,
    skillDomain,
    hash,
    categoryOf,
    colorOf,
    colors,
    gradStyle,
    tintStyle,
    ringStyle,
    hexA,
    FusionChip,
    FusionOrb,
  };
})();
