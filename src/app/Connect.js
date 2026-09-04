const { useState, useEffect, useRef } = React;
const { motion, AnimatePresence } = window.Motion;
const { Icons } = window;
const { Avatar } = window;
const { FadingVideo } = window;
const F = window.Fusion;
const Store = window.Store;

const enter = window.MotionKit.enter;

const ROOMS = [
  ["open", "Open room"],
  ["private", "Private room"],
];

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
  const [typingPeer, setTypingPeer] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const reported = new Set(s.reportedMessages);

  const scanEntries = s.roomMessages.map((m) => {
    if (m.self) return null;
    const peer = s.presence.find((p) => p.handle === m.handle);
    if (peer) {
      const parts = String(peer.fusionLabel || "").split("×").map((x) => x.trim());
      if (parts.length === 2) return { key: m.id, a: F.colorOf(parts[0]), b: F.colorOf(parts[1]) };
    }
    return { key: m.id, a: F.colorOf("Design"), b: F.colorOf("AI") };
  }).filter(Boolean);
  const bubbleRefs = window.Ambient.useAmbient(scanEntries);

  const refsById = {};
  scanEntries.forEach((e, i) => {
    refsById[e.key] = bubbleRefs[i];
  });

  useEffect(() => {
    if (scanEntries[0]) window.Ambient.setHex(scanEntries[0].a, scanEntries[0].b);
  }, []);

  function send() {
    if (!draft.trim()) return;
    Store.sendRoomMessage(draft);
    setDraft("");
    const peers = s.presence.filter((p) => p.status === "active" || p.status === "idle");
    const p = peers[Math.floor(Math.random() * peers.length)] || s.presence[0];
    if (!p) return;
    setTypingPeer(p.handle);
    timerRef.current = setTimeout(() => {
      Store.peerReplyTo();
      setTypingPeer(null);
    }, 1400);
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
        </div>
        {typingPeer && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 font-body text-[11px] font-light italic text-white/45"
          >
            {typingPeer} is typing…
          </motion.p>
        )}
      </div>

      <div className="flex max-h-[46vh] flex-col gap-4 overflow-y-auto bg-black/30 p-6">
        {reported.size > 0 && <ModBanner />}
        {s.roomMessages.map((m) => {
          const ref = refsById[m.id];
          const bubble = (
            <ChatBubble
              msg={m}
              reported={reported.has(m.id)}
              onReport={() => Store.reportRoomMessage(m.id)}
            />
          );
          return ref ? (
            <div key={m.id} ref={ref}>{bubble}</div>
          ) : (
            bubble
          );
        })}
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

function ExchangePanel({ peer }) {
  const s = Store.useStore();
  const ex = s.exchanges.find((x) => x.handle === peer.handle);

  useEffect(() => {
    if (ex && ex.status === "awaiting-peer") {
      const t = setTimeout(() => Store.peerConfirmsExchange(peer.handle), 1400);
      return () => clearTimeout(t);
    }
  }, [ex, peer.handle]);

  function propose() {
    Store.proposeExchange(peer.handle);
  }

  function finalize() {
    Store.finalizeExchange(peer.handle);
    window.Toast.show("Exchange started with " + peer.handle, "success");
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
              You and {peer.handle} are swapping notes on {peer.fusionLabel}. First round lands in a couple of days.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BlockedNote() {
  return (
    <motion.div
      {...enter(0.1)}
      className="liquid-glass-strong mx-auto flex max-w-md flex-col items-center gap-4 rounded-[1.5rem] p-10 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-white/50">
        <Icons.Lock className="h-5 w-5" />
      </span>
      <p className="font-heading text-2xl italic text-white">Conversation closed</p>
      <p className="font-body text-sm font-light leading-relaxed text-white/60">
        You moved on from this exchange. Your standing in the room isn't affected — and the other side won't see you
        anymore.
      </p>
    </motion.div>
  );
}

function ConnectPrivateRoom() {
  const s = Store.useStore();
  const peer = s.privatePeer;
  const [menuOpen, setMenuOpen] = useState(false);

  function reportPeer() {
    Store.reportPeer(peer.handle);
    setMenuOpen(false);
    window.Toast.show("Reported — conversation closed", "success");
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

      {!peer ? (
        <div className="mt-10">
          <BlockedNote />
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
                      onClick={reportPeer}
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
          <ExchangePanel peer={peer} />
        </div>
      )}
    </div>
  );
}

function Connect() {
  const [room, setRoom] = useState("open");

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
