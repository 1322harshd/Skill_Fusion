const { useState, useEffect } = React;
const { motion, AnimatePresence } = window.Motion;
const { Icons } = window;
const { Avatar } = window;
const { FadingVideo } = window;
const Store = window.Store;

const enter = window.MotionKit.enter;

const ROOMS = [
  ["open", "Open room"],
  ["private", "Private room"],
];

const ROOM_POLL_MS = 4000;
const MATCH_POLL_MS = 2500;
const EXCHANGE_POLL_MS = 3000;

const STATUS_DOT = { active: "bg-[var(--color-status-active)]", typing: "bg-[var(--color-status-typing)]", idle: "bg-white/50", away: "bg-white/15" };

function PresenceAvatar({ p }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <Avatar handle={p.handle} name={p.handle.split(".")[0]} size="lg" />
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-black ${STATUS_DOT[p.status] || "bg-white/30"}`} />
      </div>
      <span className="max-w-[72px] truncate font-body text-[11px] font-medium text-white/80">{p.handle}</span>
      <span className="max-w-[72px] truncate font-body text-[9px] font-light text-white/40">{p.fusionLabel}</span>
    </div>
  );
}

function ModBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(8px)", y: 10 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-2xl border border-white/12 bg-black/30 px-4 py-3"
    >
      <Icons.Shield className="h-4 w-4 shrink-0 text-white/60" />
      <p className="font-body text-[13px] font-light text-white/60">
        A message was moderated to keep the room useful. Everyone's welcome here.
      </p>
    </motion.div>
  );
}

function ChatBubble({ msg, reported, onReport }) {
  if (reported) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="font-body text-[13px] font-light italic text-white/45">Reported — removed for now.</p>
        </div>
      </div>
    );
  }
  return (
    <div className={"group flex items-start gap-3 " + (msg.self ? "justify-end" : "justify-start")}>
      {!msg.self && <Avatar handle={msg.handle} name={msg.handle.split(".")[0]} size="sm" />}
      <div className={msg.self ? "flex max-w-[75%] flex-col items-end gap-1" : "flex max-w-[75%] flex-col items-start gap-1"}>
        <div className={"rounded-2xl px-4 py-2.5 font-body text-sm font-light leading-relaxed " + (msg.self ? "bg-white text-black" : "liquid-glass text-white/90")}>
          {msg.text}
        </div>
        <div className="flex items-center gap-3 font-body text-[10px] font-light text-white/35">
          <span>{msg.self ? "you" : msg.handle}</span>
          <span>·</span>
          <span>{msg.ts}</span>
        </div>
      </div>
      {!msg.self && (
        <button
          type="button"
          aria-label="Report message"
          onClick={onReport}
          className="tappable flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/30 opacity-0 transition-opacity hover:bg-white/10 hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Icons.Flag className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function ConnectOpenRoom() {
  const s = Store.useStore();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    Store.loadRoomMessages().catch(() => {});
    Store.loadPresence().catch(() => {});
    Store.sendHeartbeat("active").catch(() => {});
    const t = setInterval(() => {
      Store.loadRoomMessages().catch(() => {});
      Store.loadPresence().catch(() => {});
      Store.sendHeartbeat("active").catch(() => {});
    }, ROOM_POLL_MS);
    return () => clearInterval(t);
  }, []);

  const reported = new Set(s.reportedMessages);

  async function send() {
    if (!draft.trim()) return;
    const text = draft;
    setDraft("");
    try {
      await Store.sendRoomMessage(text);
    } catch (e) {
      setDraft(text);
      window.Toast.show(e.message || "Couldn't send that — try again", "error");
    }
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/10">
      <div className="relative">
        <FadingVideo src={window.VIDEOS.HERO} className="absolute inset-0 h-48 w-full object-cover opacity-[0.18]" />
        <div className="absolute inset-0 h-48 bg-gradient-to-b from-black/40 to-black" />
        <div className="relative flex h-48 flex-col justify-end p-6">
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Open room · live now</p>
          <div className="mt-2 flex items-center gap-2.5">
            <h2 className="font-heading text-3xl italic leading-none text-white md:text-4xl">The fusion lounge</h2>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-body text-[11px] font-medium text-white/85">
              <Icons.Users className="h-3.5 w-3.5" />
              {s.presence.length} here
            </span>
          </div>
        </div>
      </div>

      <div className="border-b border-white/10 px-6 py-4">
        <div className="flex flex-wrap items-center gap-5">
          {s.presence.map((p) => (
            <PresenceAvatar key={p.handle} p={p} />
          ))}
          {s.presence.length === 0 && (
            <p className="font-body text-[12px] font-light text-white/40">No one else is here right now — be the first to say something.</p>
          )}
        </div>
      </div>

      <div className="flex max-h-[46vh] flex-col gap-4 overflow-y-auto bg-black/30 p-6">
        {reported.size > 0 && <ModBanner />}
        {s.roomMessages.map((m) => (
          <ChatBubble
            key={m.id}
            msg={m}
            reported={reported.has(m.id)}
            onReport={() => Store.reportRoomMessage(m.id).catch(() => {})}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 px-6 py-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Drop a note for the room…"
          className="liquid-glass-strong flex-1 rounded-full px-5 py-3 font-body text-sm text-white outline-none placeholder:text-white/30"
        />
        <motion.button
          type="button"
          onClick={send}
          disabled={!draft.trim()}
          whileTap={{ scale: 0.97 }}
          className={
            (draft.trim() ? "bg-white text-black" : "liquid-glass text-white/50") +
            " flex items-center gap-2 rounded-full px-5 py-3 font-body text-sm font-medium disabled:cursor-not-allowed"
          }
        >
          <Icons.Send className="h-4 w-4" />
          Send
        </motion.button>
      </div>
    </div>
  );
}

function PrivateChat({ matchId }) {
  const s = Store.useStore();
  const [draft, setDraft] = useState("");
  const reported = new Set(s.reportedMessages);

  useEffect(() => {
    Store.loadMatchMessages().catch(() => {});
    const t = setInterval(() => Store.loadMatchMessages().catch(() => {}), ROOM_POLL_MS);
    return () => clearInterval(t);
  }, [matchId]);

  async function send() {
    if (!draft.trim()) return;
    const text = draft;
    setDraft("");
    try {
      await Store.sendMatchMessage(text);
    } catch (e) {
      setDraft(text);
      window.Toast.show(e.message || "Couldn't send that — try again", "error");
    }
  }

  return (
    <div className="liquid-glass mt-6 overflow-hidden rounded-[1.5rem]">
      <div className="flex max-h-[32vh] min-h-[120px] flex-col gap-3 overflow-y-auto p-5">
        {s.privateMessages.length === 0 && (
          <p className="font-body text-[12px] font-light text-white/40">Say hello — this thread is just between you two.</p>
        )}
        {s.privateMessages.map((m) => (
          <ChatBubble
            key={m.id}
            msg={m}
            reported={reported.has(m.id)}
            onReport={() => Store.reportMatchMessage(m.id).catch(() => {})}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-white/10 p-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message your match…"
          className="liquid-glass-strong flex-1 rounded-full px-5 py-2.5 font-body text-sm text-white outline-none placeholder:text-white/30"
        />
        <motion.button
          type="button"
          onClick={send}
          disabled={!draft.trim()}
          whileTap={{ scale: 0.97 }}
          className={
            (draft.trim() ? "bg-white text-black" : "liquid-glass text-white/50") +
            " flex items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm font-medium disabled:cursor-not-allowed"
          }
        >
          <Icons.Send className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
}

function ExchangePanel({ peer }) {
  const s = Store.useStore();
  const ex = s.exchanges.find((x) => x.handle === peer.handle);

  useEffect(() => {
    Store.loadExchange().catch(() => {});
  }, [peer.handle]);

  useEffect(() => {
    if (ex && ex.status === "awaiting-peer") {
      const t = setInterval(() => Store.loadExchange().catch(() => {}), EXCHANGE_POLL_MS);
      return () => clearInterval(t);
    }
  }, [ex && ex.status, peer.handle]);

  async function propose() {
    try {
      await Store.proposeExchange(peer.handle);
    } catch (e) {
      window.Toast.show(e.message || "Couldn't propose an exchange", "error");
    }
  }

  async function finalize() {
    try {
      await Store.finalizeExchange(peer.handle);
      window.Toast.show("Exchange started with " + peer.handle, "success");
    } catch (e) {
      window.Toast.show(e.message || "Couldn't confirm the exchange", "error");
    }
  }

  return (
    <div className="liquid-glass-strong mt-8 rounded-[1.5rem] p-8 md:p-10">
      <div className="flex items-center gap-3">
        <Avatar handle={peer.handle} name={peer.handle.split(".")[0]} size="md" />
        <div>
          <p className="font-heading text-lg italic leading-none text-white">{peer.handle}</p>
          <p className="mt-1 font-body text-[11px] font-light text-white/50">{peer.fusionLabel} · skill exchange</p>
        </div>
      </div>

      <div className="mt-6 border-t border-white/10 pt-6">
        {!ex && (
          <>
            <p className="font-body text-sm font-light leading-relaxed text-white/70">
              Trade notes with {peer.handle.split(".")[0]}: you bring your {s.user.skills?.[0]?.label || "edge"}, they bring their
              {peer.fusionLabel.split("×")[1] || "edge"}. Both sides confirm before it starts.
            </p>
            <motion.button
              type="button"
              onClick={propose}
              whileTap={{ scale: 0.97 }}
              className="mt-5 flex items-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black"
            >
              <Icons.UserPlus className="h-4 w-4" />
              Propose exchange
            </motion.button>
          </>
        )}

        {ex && ex.status === "awaiting-peer" && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              className="font-body text-sm font-medium text-white/85"
            >
              {peer.handle} is confirming…
            </motion.p>
            <p className="font-body text-xs font-light text-white/45">First of two confirms — both sides, then it's on.</p>
          </div>
        )}

        {ex && ex.status === "awaiting-you" && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <p className="font-body text-sm font-light leading-relaxed text-white/75">
              {peer.handle} confirmed. It's your turn to seal it.
            </p>
            <motion.button
              type="button"
              onClick={finalize}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black"
            >
              <Icons.Check className="h-4 w-4" />
              Finalize exchange
            </motion.button>
          </div>
        )}

        {ex && ex.status === "done" && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
              <Icons.Check className="h-5 w-5" />
            </span>
            <p className="font-heading text-xl italic text-white">Exchange started</p>
            <p className="max-w-sm font-body text-[13px] font-light text-white/55">
              You and {peer.handle} are swapping notes on {peer.fusionLabel}.
              {ex.peer && <> That's {ex.peer.fullName} ({ex.peer.email}).</>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FindMatch() {
  const s = Store.useStore();
  const [joining, setJoining] = useState(null);

  async function start(label) {
    setJoining(label);
    try {
      await Store.joinMatch(label);
    } catch (e) {
      window.Toast.show(e.message || "Couldn't start matching", "error");
    } finally {
      setJoining(null);
    }
  }

  return (
    <motion.div
      {...enter(0.1)}
      className="liquid-glass-strong mx-auto flex max-w-md flex-col items-center gap-4 rounded-[1.5rem] p-10 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-white/50">
        <Icons.UserPlus className="h-5 w-5" />
      </span>
      <p className="font-heading text-2xl italic text-white">Find a peer</p>
      <p className="font-body text-sm font-light leading-relaxed text-white/60">
        Matched anonymously by fusion — no names until you both agree to swap.
      </p>
      {s.fusions.length === 0 ? (
        <p className="mt-2 font-body text-[13px] font-light text-white/45">Fuse two skills first, then come back to find a match.</p>
      ) : (
        <div className="mt-2 flex w-full flex-col gap-2">
          {s.fusions.slice(0, 4).map((f) => {
            const label = `${f.a}×${f.b}`;
            return (
              <motion.button
                key={f.id}
                type="button"
                onClick={() => start(label)}
                disabled={!!joining}
                whileTap={{ scale: 0.97 }}
                className="tappable flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black disabled:opacity-60"
              >
                {joining === label ? "Finding…" : `Match on ${label}`}
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function WaitingForMatch() {
  useEffect(() => {
    const t = setInterval(() => Store.refreshMatch().catch(() => {}), MATCH_POLL_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      {...enter(0.1)}
      className="liquid-glass-strong mx-auto flex max-w-md flex-col items-center gap-4 rounded-[1.5rem] p-10 text-center"
    >
      <motion.span
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-white/50"
      >
        <Icons.Users className="h-5 w-5" />
      </motion.span>
      <p className="font-heading text-2xl italic text-white">Waiting for a peer…</p>
      <p className="font-body text-sm font-light leading-relaxed text-white/60">
        You're first in line for this fusion. We'll connect you the moment someone else matches it.
      </p>
    </motion.div>
  );
}

function ConnectPrivateRoom() {
  const s = Store.useStore();
  const peer = s.privatePeer;
  const [menuOpen, setMenuOpen] = useState(false);

  async function doReportPeer() {
    try {
      await Store.reportPeer(peer.handle);
      setMenuOpen(false);
      window.Toast.show("Reported — conversation closed", "success");
    } catch (e) {
      window.Toast.show(e.message || "Couldn't report that peer", "error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 font-body text-[11px] font-medium text-white/85">
          <Icons.Lock className="h-3.5 w-3.5" />
          Private room · one-on-one
        </span>
        <p className="font-body text-sm font-light leading-relaxed text-white/60">
          Sparse by design. One conversation, no audience.
        </p>
      </div>

      {s.matchStatus === "waiting" ? (
        <div className="mt-10">
          <WaitingForMatch />
        </div>
      ) : !peer ? (
        <div className="mt-10">
          <FindMatch />
        </div>
      ) : (
        <div className="mt-10">
          <div className="liquid-glass flex items-center justify-between rounded-[1.5rem] p-5">
            <div className="flex items-center gap-4">
              <Avatar handle={peer.handle} name={peer.handle.split(".")[0]} size="lg" />
              <div>
                <p className="font-heading text-xl italic leading-none text-white">{peer.handle}</p>
                <p className="mt-1 font-body text-xs font-light text-white/50">{peer.fusionLabel}</p>
              </div>
            </div>
            <div className="relative">
              <button
                type="button"
                aria-label="Report menu"
                onClick={() => setMenuOpen((v) => !v)}
                className="tappable flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icons.Dots className="h-4 w-4" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="liquid-glass-strong absolute right-0 top-11 z-20 w-48 rounded-2xl p-1.5"
                  >
                    <button
                      type="button"
                      onClick={doReportPeer}
                      className="tappable flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left font-body text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
                    >
                      <Icons.Flag className="h-4 w-4 text-white/60" />
                      Report {peer.handle}
                    </button>
                    <p className="px-3 pb-1.5 pt-1 font-body text-[11px] font-light text-white/40">
                      Reports are private and reviewed by our team.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <PrivateChat matchId={s.connectMatchId} />
          <ExchangePanel peer={peer} />
        </div>
      )}
    </div>
  );
}

function Connect() {
  const [room, setRoom] = useState("open");
  const fusion = Store.useStore().fusions[0];

  useEffect(() => {
    Store.loadConnectProfile().catch(() => {});
  }, []);

  // Page ambient follows the signed-in user's fusion colors, same as every
  // other tab — peer messages tint their own bubbles, never the background.
  useEffect(() => {
    if (fusion) window.Ambient.setFusion(fusion.a, fusion.b);
    else window.Ambient.clear();
  }, [fusion?.id]);

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div {...enter()}>
        <h1 className="mt-3 font-heading text-5xl italic leading-[1.0] tracking-[-3px] text-white md:text-6xl">Connect</h1>
      </motion.div>

      <motion.div {...enter(0.08)} className="mt-8 flex gap-1.5">
        {ROOMS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setRoom(key)}
            className={
              (room === key ? "bg-white text-black" : "liquid-glass text-white/85 hover:text-white") +
              " tappable flex items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm font-medium transition-colors"
            }
          >
            {key === "open" ? <Icons.Users className="h-4 w-4" /> : <Icons.Lock className="h-4 w-4" />}
            {label}
          </button>
        ))}
      </motion.div>

      <div className="mt-8">
        <AnimatePresence mode="wait">
          {room === "open" ? (
            <motion.div key="open" {...enter(0.12)}>
              <ConnectOpenRoom />
            </motion.div>
          ) : (
            <motion.div key="private" {...enter(0.12)}>
              <ConnectPrivateRoom />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

window.Connect = Connect;
