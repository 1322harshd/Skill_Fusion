const { useEffect, useRef } = React;
const { motion } = window.Motion;
const F = window.Fusion;

(function () {
  let state = { a: "#0a0a0c", b: "#0a0a0c" };
  let version = 0;
  const listeners = new Set();

  function emit() {
    version++;
    listeners.forEach((fn) => fn());
  }

  window.Ambient = {};

  window.Ambient.setHex = function (a, b) {
    const na = a || "#0a0a0c";
    const nb = b || "#0a0a0c";
    if (na === state.a && nb === state.b) return;
    state = { a: na, b: nb };
    emit();
  };

  window.Ambient.setFusion = function (a, b) {
    const [ca, cb] = F.colors(a || "Skill A", b || "Skill B");
    window.Ambient.setHex(ca, cb);
  };

  window.Ambient.clear = function () {
    window.Ambient.setHex("#0a0a0c", "#0a0a0c");
  };

  window.Ambient.current = function () {
    return state;
  };

  window.Ambient.subscribe = function (fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  window.Ambient.use = function () {
    return React.useSyncExternalStore(window.Ambient.subscribe, window.Ambient.current);
  };
})();

function AmbientBackground() {
  const { a, b } = window.Ambient.use();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a0a0c]">
      <motion.div
        aria-hidden
        className="absolute inset-0"
        animate={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      />
    </div>
  );
}

window.Ambient.useAmbient = function (entries) {
  const refsRef = useRef({});
  const refs = entries.map((e) => {
    if (!refsRef.current[e.key]) refsRef.current[e.key] = React.createRef();
    return refsRef.current[e.key];
  });

  useEffect(() => {
    if (!entries.length) return;
    const setFor = (idx) => {
      const e = entries[idx];
      window.Ambient.setHex(e.a, e.b);
    };
    const nodes = refs.map((r) => r.current).filter(Boolean);
    if (!nodes.length) return;

    const map = new Map(nodes.map((n, i) => [n, i]));
    const io = new IntersectionObserver(
      (items) => {
        items.forEach((it) => {
          if (it.isIntersecting && map.has(it.target)) setFor(map.get(it.target));
        });
      },
      { root: null, rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [entries.length, JSON.stringify(entries.map((e) => [e.key, e.a, e.b]))]);

  return refs;
};

window.AmbientBackground = AmbientBackground;