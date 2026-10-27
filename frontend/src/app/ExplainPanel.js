const { useState } = React;
const { motion, AnimatePresence } = window.Motion;
const { Icons } = window;
const Store = window.Store;

function ExplainPanel({ a, b, fusionId, logTitle, logTags = [], placeholder, buttonLabel = "Explain",
                        submitMode = false, projectBrief = null }) {
  const [text, setText] = useState("");
  const [fb, setFb] = useState(null);
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState(null);
  const [sourceLink, setSourceLink] = useState("");
  const [assessment, setAssessment] = useState(null);
  const fileInput = React.useRef(null);

  async function submit() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      let result = null;
      if (submitMode && (file || sourceLink.trim())) {
        const fd = new FormData();
        fd.append("fusion_id", fusionId || "");
        fd.append("explanation", text.trim());
        if (sourceLink.trim()) fd.append("source_link", sourceLink.trim());
        if (projectBrief) fd.append("brief", JSON.stringify(projectBrief));
        if (file) fd.append("file", file);
        result = await window.Api.submitProjectWork(fd);
        setAssessment(result && result.submission ? result.submission : null);
      } else {
        const res = await Store.explainFeedback(a, b, text);
        setFb(res || {});
      }
      const assessed = result && result.submission ? result.submission : null;
      Store.addLog({
        fusionId,
        title: logTitle,
        description: text.trim() + (assessed && assessed.verdict
          ? `\n\nAssessment: ${assessed.verdict.verdict} (${assessed.verdict.matchScore === null ? "n/a" : assessed.verdict.matchScore + "/100"})` : ""),
        date: "Today",
        tags: logTags,
        source: assessed ? (assessed.filename || assessed.sourceLink || "artifact") : "self-reported",
      });
      window.Toast.show(assessed ? "Work submitted and assessed — logged to your Growth Log" : "Logged to your Growth Log", "success");
    } catch (e) {
      window.Toast.show((e && e.message) || "Feedback unreachable — check the AI service and retry", "error");
    } finally {
      setSending(false);
    }
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

      {submitMode && (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,.md"
              className="sr-only"
              onChange={(e) => setFile(e.target.files && e.target.files[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileInput.current && fileInput.current.click()}
              className="liquid-glass flex w-full items-center gap-2 rounded-xl px-4 py-2.5 font-body text-sm text-white/85 transition-colors hover:text-white"
            >
              <Icons.UploadCloud className="h-4 w-4" />
              {file ? file.name : "Upload work (.pdf, .txt, .md)"}
            </button>
          </div>
          <input
            type="url"
            value={sourceLink}
            onChange={(e) => setSourceLink(e.target.value)}
            placeholder="Or a source link — GitHub, Figma, deployed URL…"
            className="w-full rounded-xl bg-black/40 px-4 py-2.5 font-body text-sm text-white outline-none ring-1 ring-white/15 transition-shadow focus:ring-white/40"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <motion.button
          type="button"
          onClick={submit}
          disabled={!text.trim() || sending || (submitMode && !file && !sourceLink.trim())}
          whileTap={{ scale: 0.97 }}
          className={
            (text.trim() && (!submitMode || file || sourceLink.trim()) && !sending ? "bg-white text-black" : "liquid-glass text-white/50") +
            " flex items-center gap-2 rounded-full px-5 py-2 font-body text-sm font-medium disabled:cursor-not-allowed"
          }
        >
          {sending ? "Assessing…" : buttonLabel}
          <Icons.Send className="h-3.5 w-3.5" />
        </motion.button>
        <a href="#/posts" className="font-body text-sm text-white/60 transition-colors hover:text-white">
          Draft a post instead
        </a>
      </div>

      <AnimatePresence>
        {assessment && assessment.verdict && (
          <motion.div
            initial={{ opacity: 0, filter: "blur(8px)", y: 10 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mt-4 rounded-xl border border-white/15 bg-black/30 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-body text-[11px] font-semibold text-black">
                <Icons.ChartLine className="h-3 w-3" />
                {assessment.verdict.matchScore === null ? "n/a" : assessment.verdict.matchScore + "/100"}
              </span>
              <span className="rounded-full px-3 py-1 font-body text-[11px] font-medium text-white/80 ring-1 ring-white/20">
                {assessment.verdict.closeness}
              </span>
            </div>
            <p className="mt-3 font-body text-sm font-light text-white/85">{assessment.verdict.verdict}</p>
            {assessment.verdict.strengths && assessment.verdict.strengths.length > 0 && (
              <div className="mt-3">
                <p className="font-body text-[10px] uppercase tracking-[0.18em] text-white/50">Strengths</p>
                {assessment.verdict.strengths.map((s, i) => (
                  <p key={i} className="mt-1 font-body text-[13px] font-light text-white/85">+ {s}</p>
                ))}
              </div>
            )}
            {assessment.verdict.gaps && assessment.verdict.gaps.length > 0 && (
              <div className="mt-3">
                <p className="font-body text-[10px] uppercase tracking-[0.18em] text-white/50">Gaps</p>
                {assessment.verdict.gaps.map((s, i) => (
                  <p key={i} className="mt-1 font-body text-[13px] font-light text-white/55">− {s}</p>
                ))}
              </div>
            )}
          </motion.div>
        )}
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
