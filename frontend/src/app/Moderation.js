const { useState, useEffect } = React;
const { motion, AnimatePresence } = window.Motion;
const { Icons } = window;

const enter = window.MotionKit.enter;

function reportedText(report) {
  if (report.roomMessageText) return { label: "Open room", text: report.roomMessageText };
  if (report.privateMessageText) return { label: "Private room", text: report.privateMessageText };
  return null;
}

function ReportCard({ report, onAction }) {
  const [acting, setActing] = useState(null);
  const content = reportedText(report);

  async function act(action) {
    setActing(action);
    try {
      await onAction(report.reportId, action);
    } finally {
      setActing(null);
    }
  }

  return (
    <motion.div {...enter(0.05)} className="liquid-glass rounded-[1.5rem] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-heading text-lg italic leading-none text-white">{report.targetHandle}</p>
          {report.autoFlagged && (
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 font-body text-[10px] font-medium text-white/70">
              <Icons.Shield className="h-3 w-3" />
              Auto-flagged
            </span>
          )}
          {content && (
            <span className="rounded-full border border-white/15 px-2.5 py-0.5 font-body text-[10px] text-white/50">
              {content.label}
            </span>
          )}
        </div>
        <p className="font-body text-[11px] font-light text-white/40">
          {new Date(report.createdAt).toLocaleString()}
        </p>
      </div>

      {content && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="font-body text-sm font-light text-white/80">"{content.text}"</p>
        </div>
      )}

      {report.reason && (
        <p className="mt-3 font-body text-[13px] font-light text-white/55">Reason: {report.reason}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!acting}
          onClick={() => act("warn")}
          className="tappable flex items-center gap-1.5 rounded-full liquid-glass px-4 py-2 font-body text-sm font-medium text-white/85 disabled:opacity-50"
        >
          <Icons.Shield className="h-4 w-4" />
          {acting === "warn" ? "Warning…" : "Warn"}
        </button>
        <button
          type="button"
          disabled={!!acting}
          onClick={() => act("ban")}
          className="tappable flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-body text-sm font-medium text-black disabled:opacity-50"
        >
          <Icons.X className="h-4 w-4" />
          {acting === "ban" ? "Banning…" : "Ban"}
        </button>
        <button
          type="button"
          disabled={!!acting}
          onClick={() => act("dismiss")}
          className="tappable flex items-center gap-1.5 rounded-full px-4 py-2 font-body text-sm font-light text-white/50 hover:text-white disabled:opacity-50"
        >
          {acting === "dismiss" ? "Dismissing…" : "Dismiss"}
        </button>
      </div>
    </motion.div>
  );
}

function Moderation() {
  const s = window.Store.useStore();
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | forbidden | error

  async function load() {
    try {
      const data = await window.Api.connectModerationReports();
      setReports(data);
      setStatus("ok");
    } catch (e) {
      setStatus(e.status === 403 ? "forbidden" : "error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAction(reportId, action) {
    try {
      await window.Api.connectModerationAction(reportId, action);
      setReports((rs) => rs.filter((r) => r.reportId !== reportId));
      window.Toast.show(
        action === "warn" ? "User warned" : action === "ban" ? "User banned" : "Report dismissed",
        "success"
      );
    } catch (e) {
      window.Toast.show(e.message || "Couldn't record that action", "error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div {...enter()}>
        <h1 className="mt-3 font-heading text-5xl italic leading-[1.0] tracking-[-3px] text-white md:text-6xl">
          Moderation
        </h1>
        <p className="mt-4 font-body text-sm font-light text-white/60">
          Pending reports from Connect — review and warn, ban or dismiss.
        </p>
      </motion.div>

      <div className="mt-10">
        {status === "loading" && (
          <p className="font-body text-sm font-light text-white/50">Loading reports…</p>
        )}

        {status === "forbidden" && (
          <div className="liquid-glass-strong rounded-[1.5rem] p-10 text-center">
            <p className="font-heading text-xl italic text-white">Staff only</p>
            <p className="mt-2 font-body text-sm font-light text-white/60">
              You don't have access to moderation. Signed in as {s.user.email || "a non-staff account"}.
            </p>
          </div>
        )}

        {status === "error" && (
          <p className="font-body text-sm font-light text-red-300">Couldn't load reports — try reloading.</p>
        )}

        {status === "ok" && reports.length === 0 && (
          <div className="liquid-glass rounded-[1.5rem] p-10 text-center">
            <p className="font-body text-sm font-light text-white/50">Nothing pending — the queue is clear.</p>
          </div>
        )}

        {status === "ok" && reports.length > 0 && (
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {reports.map((r) => (
                <ReportCard key={r.reportId} report={r} onAction={handleAction} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

window.Moderation = Moderation;
