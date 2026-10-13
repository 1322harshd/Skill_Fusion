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
      if (!e.shiftKey && document.activeElement === first) {
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

window.Modal = Modal;
