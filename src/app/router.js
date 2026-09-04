window.Router = (function () {
  const listeners = new Set();

  function parse() {
    const raw = window.location.hash.replace(/^#/, "");
    return raw === "" ? "/" : raw;
  }

  function current() {
    return parse();
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function navigate(to) {
    const next = to.startsWith("/") ? to : "/" + to;
    if (current() === next) return;
    window.location.hash = next;
  }

  function go(to) {
    navigate(to);
  }

  function match(pattern) {
    const parts = pattern.split("/").filter(Boolean);
    const cur = current().split("/").filter(Boolean);
    if (parts.length !== cur.length) return null;
    const params = {};
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(cur[i]);
      else if (p !== cur[i]) return null;
    }
    return params;
  }

  window.addEventListener("hashchange", () => listeners.forEach((fn) => fn()));

  return { current, subscribe, navigate, go, match };
})();

function useRoute() {
  return React.useSyncExternalStore(window.Router.subscribe, window.Router.current);
}

window.useRoute = useRoute;
