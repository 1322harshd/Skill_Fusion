window.Router = (function () {
  const listeners = new Set();

  function raw() {
    return window.location.hash.replace(/^#/, "");
  }

  function parse() {
    const path = raw().split("?")[0];
    return path === "" ? "/" : path;
  }

  function current() {
    return parse();
  }

  function query() {
    const qIndex = raw().indexOf("?");
    return new URLSearchParams(qIndex >= 0 ? raw().slice(qIndex + 1) : "");
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

  return { current, subscribe, navigate, go, match, query };
})();

function useRoute() {
  return React.useSyncExternalStore(window.Router.subscribe, window.Router.current);
}

window.useRoute = useRoute;
