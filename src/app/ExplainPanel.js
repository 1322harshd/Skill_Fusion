const { useState } = React;
const { motion, AnimatePresence } = window.Motion;
const { Icons } = window;
const Store = window.Store;

function ExplainPanel({ a, b, fusionId, logTitle, logTags = [], placeholder, buttonLabel = "Explain" }) {
  const [text, setText] = useState("");
  const [fb, setFb] = useState(null);
  const [sending, setSending] = useState(false);

  function submit() {
    if (!text.trim() || sending) return;
    setSending(true);
    setTimeout(() => {
      const res = Store.explainFeedback(a, b, text);
      setFb(res);
      Store.addLog({
        fusionId,
        title: logTitle,
        description: text.trim(),
        date: "Today",
        tags: logTags,
        source: "self-reported",
      });
      window.Toast.show("Logged to your Growth Log", "success");
      setSending(false);
    }, 700);
  }

  return (
    <div className="liquid-glass-strong mt-4 rounded-2xl p-5">
      <p className="font-heading text-lg italic text-white">Explain it</p>
      <p className="mt-1 font-body text-xs font-light text-white/60">
        Put what you just did into your own words.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="mt-3 w-full rounded-xl bg-black/40 px-4 py-3 font-body text-sm text-white outline-none ring-1 ring-white/15 transition-shadow focus:ring-white/40"
      />

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <motion.button
          type="button"
          onClick={submit}
          disabled={!text.trim() || sending}
          whileTap={{ scale: 0.97 }}
          className={
            (text.trim() && !sending ? "bg-white text-black" : "liquid-glass text-white/50") +
            " flex items-center gap-2 rounded-full px-5 py-2 font-body text-sm font-medium disabled:cursor-not-allowed"
          }
        >
          {sending ? "Reading…" : buttonLabel}
          <Icons.Send className="h-3.5 w-3.5" />
        </motion.button>
        <a href="#/posts" className="font-body text-sm text-white/60 transition-colors hover:text-white">
          Draft a post instead
        </a>
      </div>

      <AnimatePresence>
        {fb && (
          <motion.div
            initial={{ opacity: 0, filter: "blur(8px)", y: 10 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mt-4 rounded-xl border border-white/15 bg-black/30 p-4"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-body text-[11px] font-semibold text-black">
              <Icons.CheckCircle className="h-3 w-3" />
              Clarity: {fb.clarity}
            </span>
            <p className="mt-3 font-body text-sm font-light text-white/85">{fb.note}</p>
            <p className="mt-2 font-body text-[13px] font-light text-white/55">Try: {fb.suggestion}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

function Modal({ open, onClose, children }) {
  const panelRef = React.useRef(null);
  const triggerRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    const first = panelRef.current && panelRef.current.querySelector(FOCUSABLE);
    (first || panelRef.current)?.focus?.();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const els = Array.from(panelRef.current.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (open) return;
    triggerRef.current && triggerRef.current.focus && triggerRef.current.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Dialog"
            aria-describedby="modal-desc"
            className="liquid-glass-strong relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[1.5rem] p-6"
            initial={{ opacity: 0, filter: "blur(6px)", y: 20, scale: 0.98 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0, scale: 1 }}
            exit={{ opacity: 0, filter: "blur(6px)", y: 14, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <span id="modal-desc" className="sr-only">
              Modal dialog
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="tappable absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Icons.X className="h-4 w-4" />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

window.ExplainPanel = ExplainPanel;
window.Modal = Modal;
