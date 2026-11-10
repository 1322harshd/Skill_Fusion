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
  const [zip, setZip] = useState(null); // async zip review: seed after submit, live status after that
  const fileInput = React.useRef(null);

  async function submit() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      let result = null;
      let asyncSub = null;
      if (submitMode && (file || sourceLink.trim())) {
        const fd = new FormData();
        fd.append("fusion_id", fusionId || "");
        fd.append("explanation", text.trim());
        if (sourceLink.trim()) fd.append("source_link", sourceLink.trim());
        if (projectBrief) fd.append("brief", JSON.stringify(projectBrief));
        if (file) fd.append("file", file);
        result = await window.Api.submitProjectWork(fd);
        const sub = result && result.submission;
        asyncSub = sub && sub.async ? sub : null;
        if (asyncSub) {
          // Zip with gradeable files: SF reads them one by one in the
          // background — the card below polls and reports per file.
          setZip({ ...asyncSub, explanation: text.trim() });
          window.Toast.show(
            "Attachment submitted — grading " + asyncSub.readableCount +
            " file" + (asyncSub.readableCount === 1 ? "" : "s") + " (~" +
            Math.max(1, Math.round((asyncSub.estSeconds || 0) / 60)) +
            " min). Scores appear here as they land.", "success");
        } else if (sub) {
          setAssessment(sub);
        }
      } else {
        const res = await Store.explainFeedback(a, b, text.trim());
        setFb(res || {});
      }
      if (!asyncSub) {
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
      }
    } catch (e) {
      window.Toast.show((e && e.message) || "Feedback unreachable — check the AI service and retry", "error");
    } finally {
      setSending(false);
    }
  }

  function onZipDone(s) {
    const exp = (zip && zip.explanation) || "";
    setZip(s);
    if (s.verdict) {
      setAssessment(s);
      if (fusionId && typeof s.verdict.matchScore === "number") {
        Store.setGrade(fusionId, s.verdict.matchScore);
      }
    }
    const score = s.verdict && typeof s.verdict.matchScore === "number" ? s.verdict.matchScore + "/100" : "n/a";
    window.Toast.show("Zip graded — " + score, "success");
    Store.addLog({
      fusionId,
      title: logTitle,
      description: exp + (s.verdict ? `\n\nAssessment: ${s.verdict.verdict} (${score})` : ""),
      date: "Today",
      tags: logTags,
      source: (s.files && s.files.length ? s.files.length + " zip files" : (s.filename || "artifact")),
    });
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
              className="sr-only"
              onChange={(e) => setFile(e.target.files && e.target.files[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileInput.current && fileInput.current.click()}
              className="liquid-glass flex w-full items-center gap-2 rounded-xl px-4 py-2.5 font-body text-sm text-white/85 transition-colors hover:text-white"
            >
              <Icons.UploadCloud className="h-4 w-4" />
              {(file ? file.name : "Add proof or attachment").length > 34
                ? (file ? file.name : "Add proof or attachment").slice(0, 32) + "…" : (file ? file.name : "Add proof or attachment")}
            </button>
            <p className="mt-1 font-body text-[10px] text-white/40">Any document (PDF, docx, code, images, zip) · max 10MB</p>
          </div>
          <input
            type="url"
            value={sourceLink}
            onChange={(e) => setSourceLink(e.target.value)}
            placeholder="Or a link — website, Drive, GitHub, live app…"
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
        {zip && (
          <ZipGradingCard
            seed={zip}
            logTitle={logTitle}
            logTags={logTags}
            onDone={onZipDone}
          />
        )}
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
            {assessment.attachmentNote && (
              <p className="mt-2 font-body text-[11px] text-white/55">📎 {assessment.attachmentNote}</p>
            )}
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

function ZipGradingCard({ seed, fusionId, logTitle, logTags, onDone }) {
  const [sub, setSub] = useState(seed);
  const [stale, setStale] = useState(false);
  const [resuming, setResuming] = useState(false);

  React.useEffect(() => {
    if (!sub || !sub.id || sub.status !== "grading" || stale) return undefined;
    let alive = true;
    const started = Date.now();
    const iv = setInterval(async () => {
      if (Date.now() - started > 10 * 60 * 1000) {
        if (alive) setStale(true);
        clearInterval(iv);
        return;
      }
      try {
        const res = await window.Api.submissionStatus(sub.id);
        if (!alive) return;
        const s = res && res.submission;
        if (s) {
          setSub(s);
          if (s.status !== "grading") {
            clearInterval(iv);
            if (typeof onDone === "function") onDone(s);
          }
        }
      } catch (e) { /* transient — server busy or restarting; keep polling */ }
    }, 5000);
    return () => { alive = false; clearInterval(iv); };
  }, [sub && sub.id, sub && sub.status, stale]);

  async function regrade() {
    setResuming(true);
    try {
      const res = await window.Api.regradeSubmission(sub.id);
      setStale(false);
      if (res && res.submission) setSub(res.submission);
    } catch (e) {
      window.Toast.show((e && e.message) || "Re-grade couldn't start", "error");
    } finally {
      setResuming(false);
    }
  }

  const files = sub.files || [];
  const scored = files.filter((f) => typeof f.score === "number");
  const readable = files.length || seed.readableCount || 0;
  const skippedCount = (sub.skippedCount || 0) || (seed.skipped || []).length;
  const etaMin = Math.max(1, Math.round((sub.estSeconds || seed.estSeconds || 0) / 60));
  const done = sub.status === "graded";
  const pending = sub.status === "grading" && !stale;

  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(8px)", y: 10 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-4 rounded-xl border border-white/15 bg-black/30 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={"inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-body text-[11px] font-semibold " +
          (done ? "bg-white text-black" : "bg-white/10 text-white/80 ring-1 ring-white/20")}>
          <Icons.UploadCloud className="h-3 w-3" />
          {done ? "Graded " + readable + " files"
            : sub.status === "failed" ? "Grading interrupted"
            : stale ? "Still grading — past 10 min" : "Zip review"}
        </span>
        {pending && (
          <span className="font-body text-[11px] text-white/60">
            {readable ? "Reading file " + Math.min(scored.length + 1, readable) + " of " + readable : "Estimating…"}
            {" · come back in ~" + etaMin + " min"}
          </span>
        )}
      </div>
      {readable > 0 && (
        <div className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <div key={f.name || i} className="flex items-center gap-2 font-body text-[13px] font-light">
              <span className={typeof f.score === "number" ? "text-emerald-300" : "text-white/35"}>
                {typeof f.score === "number" ? "✓" : "◌"}
              </span>
              <span className="truncate text-white/85">{f.name}</span>
              <span className="ml-auto font-mono text-[12px] text-white/70">
                {f.note && f.note.toLowerCase().includes("failed")
                  ? f.note.replace(" — retry with Re-grade", "")
                  : typeof f.score === "number" ? "score " + f.score : "queued"}
              </span>
            </div>
          ))}
        </div>
      )}
      {skippedCount > 0 && (
        <p className="mt-2 font-body text-[11px] text-white/45">
          • {skippedCount} other entr{skippedCount === 1 ? "y" : "ies"} skipped — not machine-readable
        </p>
      )}
      {done && sub.verdict && (
        <p className="mt-3 font-body text-sm font-light text-white/85">{sub.verdict.verdict}</p>
      )}
      {(sub.status === "failed" || stale) && (
        <div className="mt-3 flex items-center gap-3">
          <p className="font-body text-[12px] text-white/55">
            {scored.length}/{readable} graded — Re-grade resumes from file {scored.length + 1}.
          </p>
          <button
            type="button"
            onClick={regrade}
            disabled={resuming}
            className="rounded-full bg-white px-4 py-1.5 font-body text-[12px] font-medium text-black disabled:opacity-60"
          >
            {resuming ? "Resuming…" : "Re-grade"}
          </button>
        </div>
      )}
    </motion.div>
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
