const { useState, useEffect } = React;
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

const ROOM_POLL_MS = 4000;
const MATCH_POLL_MS = 2500;
const EXCHANGE_POLL_MS = 3000;

const STATUS_DOT = { active: "bg-[var(--color-status-active)]", typing: "bg-[var(--color-status-typing)]", idle: "bg-white/50", away: "bg-white/15" };

function PresenceAvatar({ p, onClick }) {
  return (
    <button type="button" onClick={onClick} className="tappable flex flex-col items-center gap-1.5">
      <div className="relative">
        <Avatar handle={p.handle} name={p.handle.split(".")[0]} size="lg" />
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-black ${STATUS_DOT[p.status] || "bg-white/30"}`} />
      </div>
      <span className="max-w-[72px] truncate font-body text-[11px] font-medium text-white/80">{p.handle}</span>
      <span className="max-w-[72px] truncate font-body text-[9px] font-light text-white/40">{p.fusionLabel}</span>
    </button>
  );
}

function PeerProfileModal({ peer, onClose, onMessage }) {
  const [sending, setSending] = useState(false);
  if (!peer) return null;

  const parts = String(peer.fusionLabel || "").split("×").map((x) => x.trim());
  const hasFusion = parts.length === 2 && parts[0] && parts[1];

  async function handleMessage() {
    setSending(true);
    await onMessage(peer.handle);
    setSending(false);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="liquid-glass-strong w-full max-w-sm rounded-[1.5rem] p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-4">
            <Avatar handle={peer.handle} name={peer.handle.split(".")[0]} size="lg" />
            <div>
              <p className="font-heading text-xl italic leading-none text-white">{peer.handle}</p>
              <p className="mt-1 font-body text-xs font-light text-white/50">
                {peer.status === "active" ? "Active now" : peer.status === "idle" ? "Idle" : "Here"}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/40">Fusing</p>
            <div className="mt-2">
              {hasFusion ? (
                <F.FusionChip a={parts[0]} b={parts[1]} size="md" />
              ) : (
                <span className="font-body text-sm font-light text-white/50">Not fusing right now</span>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <Icons.Activity className="h-4 w-4 text-white/50" />
            <p className="font-body text-sm font-light text-white/70">
              {peer.streak == null
                ? "Streak unknown"
                : peer.streak > 0
                ? `${peer.streak}-day streak`
                : "No active streak"}
            </p>
          </div>

          <motion.button
            type="button"
            onClick={handleMessage}
            disabled={sending}
            whileTap={{ scale: 0.97 }}
            className="tappable mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icons.Lock className="h-4 w-4" />
            {sending ? "Starting…" : "Message privately"}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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

function ChatBubble({ msg, reported, onReport, onAvatarClick, displayName }) {
  const shownName = displayName || msg.handle;
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
      {!msg.self && (
        <button type="button" onClick={onAvatarClick} aria-label={"View " + msg.handle} className="tappable shrink-0">
          <Avatar handle={msg.handle} name={shownName.split(" ")[0] || shownName} size="sm" />
        </button>
      )}
      <div className={msg.self ? "flex max-w-[75%] flex-col items-end gap-1" : "flex max-w-[75%] flex-col items-start gap-1"}>
        <div className={"rounded-2xl px-4 py-2.5 font-body text-sm font-light leading-relaxed " + (msg.self ? "bg-white text-black" : "liquid-glass text-white/90")}>
          {msg.text}
        </div>
        <div className="flex items-center gap-3 font-body text-[10px] font-light text-white/35">
          <span>{msg.self ? "you" : shownName}</span>
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

function ConnectOpenRoom({ onOpenPrivate }) {
  const s = Store.useStore();
  const [draft, setDraft] = useState("");
  const [profilePeer, setProfilePeer] = useState(null);

  function openProfile(handle) {
    const peer = s.presence.find((p) => p.handle === handle);
    setProfilePeer(peer || { handle, fusionLabel: null, streak: null, status: null });
  }

  async function handleMessagePrivately(handle) {
    try {
      await Store.messagePeer(handle);
      setProfilePeer(null);
      onOpenPrivate();
    } catch (e) {
      window.Toast.show(e.message || "Couldn't start that chat", "error");
    }
  }

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
    <>
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
            <PresenceAvatar key={p.handle} p={p} onClick={() => setProfilePeer(p)} />
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
            onAvatarClick={() => openProfile(m.handle)}
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
    <PeerProfileModal peer={profilePeer} onClose={() => setProfilePeer(null)} onMessage={handleMessagePrivately} />
    </>
  );
}

// The message thread for one open conversation — polls for new messages
// while mounted, and swaps the composer for a read-only note once blocked.
function PrivateChat({ conversationId, readOnly, peerDisplayName }) {
  const s = Store.useStore();
  const [draft, setDraft] = useState("");
  const reported = new Set(s.reportedMessages);

  useEffect(() => {
    Store.loadConversationMessages().catch(() => {});
    const t = setInterval(() => Store.loadConversationMessages().catch(() => {}), ROOM_POLL_MS);
    return () => clearInterval(t);
  }, [conversationId]);

  async function send() {
    if (!draft.trim()) return;
    const text = draft;
    setDraft("");
    try {
      await Store.sendConversationMessage(text);
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
            onReport={() => Store.reportPrivateMessage(m.id).catch(() => {})}
            displayName={!m.self ? peerDisplayName : null}
          />
        ))}
      </div>
      {readOnly ? (
        <div className="flex items-center justify-center gap-2 border-t border-white/10 p-4 font-body text-[12px] font-light text-white/40">
          <Icons.Lock className="h-3.5 w-3.5" />
          This conversation is closed — the history stays, but you can't send new messages.
        </div>
      ) : (
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
      )}
    </div>
  );
}

// The mutual-consent identity reveal, as a small pill under the chat rather
// than a full card — propose/awaiting/confirm/done, one state at a time.
function ExchangePanel({ peer, conversationId, disabled }) {
  const s = Store.useStore();
  const exRaw = s.exchanges.find((x) => x.conversationId === conversationId);
  // A fetched-but-empty exchange ({status: "none"}) must behave the same as
  // no exchange at all — otherwise it's truthy and none of the branches
  // below match, silently rendering nothing once the fetch resolves.
  const ex = exRaw && exRaw.status !== "none" ? exRaw : null;

  useEffect(() => {
    Store.loadExchange().catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    if (ex && ex.status === "awaiting-peer") {
      const t = setInterval(() => Store.loadExchange().catch(() => {}), EXCHANGE_POLL_MS);
      return () => clearInterval(t);
    }
  }, [ex && ex.status, conversationId]);

  async function propose() {
    try {
      await Store.proposeExchange();
    } catch (e) {
      window.Toast.show(e.message || "Couldn't propose an exchange", "error");
    }
  }

  async function finalize() {
    try {
      await Store.finalizeExchange();
      window.Toast.show("Identities revealed", "success");
    } catch (e) {
      window.Toast.show(e.message || "Couldn't confirm the exchange", "error");
    }
  }

  // A small pill, not a card — the exchange is a secondary, occasional
  // action, so it shouldn't compete with the chat for visual weight.
  if (ex && ex.status === "done") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
        <Icons.Check className="h-3.5 w-3.5 shrink-0 text-white/60" />
        <p className="truncate font-body text-[12px] font-light text-white/60">
          Identities revealed
          {ex.peer && (
            <>
              {" — you're chatting with "}
              <span className="font-medium text-white/85">{ex.peer.fullName}</span>
            </>
          )}
        </p>
      </div>
    );
  }

  if (disabled) return null;

  if (!ex) {
    return (
      <motion.button
        type="button"
        onClick={propose}
        whileTap={{ scale: 0.97 }}
        className="tappable mt-3 flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 font-body text-[12px] font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
      >
        <Icons.UserPlus className="h-3.5 w-3.5" />
        Propose identity exchange
      </motion.button>
    );
  }

  if (ex.status === "awaiting-peer") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/50"
        />
        <p className="truncate font-body text-[12px] font-light text-white/50">Waiting for {peer.handle} to confirm the exchange…</p>
      </div>
    );
  }

  if (ex.status === "awaiting-you") {
    return (
      <motion.button
        type="button"
        onClick={finalize}
        whileTap={{ scale: 0.97 }}
        className="tappable mt-3 flex items-center gap-2 rounded-full bg-white px-4 py-2 font-body text-[12px] font-medium text-black"
      >
        <Icons.Check className="h-3.5 w-3.5" />
        {peer.handle} confirmed — confirm to reveal identities
      </motion.button>
    );
  }

  return null;
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

function WaitingForAccept({ peer }) {
  return (
    <motion.div
      {...enter(0.1)}
      className="liquid-glass-strong mx-auto flex max-w-md flex-col items-center gap-4 rounded-[1.5rem] p-10 text-center"
    >
      <div className="relative">
        <Avatar handle={peer.handle} name={peer.handle.split(".")[0]} size="lg" />
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
          className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-black bg-white/60"
        />
      </div>
      <p className="font-heading text-2xl italic text-white">Waiting for {peer.handle}…</p>
      <p className="font-body text-sm font-light leading-relaxed text-white/60">
        They need to agree before the chat opens. We'll let you know the moment they accept.
      </p>
    </motion.div>
  );
}

function IncomingRequest({ peer, onRespond }) {
  const [responding, setResponding] = useState(null);

  async function respond(action) {
    setResponding(action);
    try {
      await onRespond(action);
    } catch (e) {
      window.Toast.show(e.message || "Couldn't respond to that request", "error");
      setResponding(null);
    }
  }

  return (
    <motion.div
      {...enter(0.1)}
      className="liquid-glass-strong mx-auto flex max-w-md flex-col items-center gap-4 rounded-[1.5rem] p-10 text-center"
    >
      <Avatar handle={peer.handle} name={peer.handle.split(".")[0]} size="lg" />
      <p className="font-heading text-2xl italic text-white">{peer.handle} wants to chat</p>
      <p className="font-body text-sm font-light leading-relaxed text-white/60">
        {peer.fusionLabel ? `They're fusing ${peer.fusionLabel}.` : ""} Accepting opens a private, anonymous room — just between you two.
      </p>
      <div className="mt-2 flex gap-2">
        <motion.button
          type="button"
          onClick={() => respond("accept")}
          disabled={!!responding}
          whileTap={{ scale: 0.97 }}
          className="tappable flex items-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black disabled:opacity-60"
        >
          <Icons.Check className="h-4 w-4" />
          {responding === "accept" ? "Accepting…" : "Accept"}
        </motion.button>
        <motion.button
          type="button"
          onClick={() => respond("decline")}
          disabled={!!responding}
          whileTap={{ scale: 0.97 }}
          className="tappable liquid-glass flex items-center gap-2 rounded-full px-6 py-3 font-body text-sm font-medium text-white/85 disabled:opacity-60"
        >
          {responding === "decline" ? "Declining…" : "Decline"}
        </motion.button>
      </div>
    </motion.div>
  );
}

function closeReasonText(reason, direction) {
  if (reason === "declined") {
    // direction "incoming" here means the viewer received the request —
    // i.e. they're the one who just declined it.
    return direction === "incoming"
      ? "You declined the request. No hard feelings — the room's still full of other people to talk to."
      : "They declined your chat request. No hard feelings — the room's still full of other people to talk to.";
  }
  if (reason === "reported") return "You reported this peer and the conversation was closed.";
  if (reason === "left") return "That conversation has ended.";
  return "That conversation has ended. Your standing in the room isn't affected.";
}

function ClosedNote({ reason, direction, onFindAnother }) {
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
        {closeReasonText(reason, direction)}
      </p>
      <motion.button
        type="button"
        onClick={onFindAnother}
        whileTap={{ scale: 0.97 }}
        className="tappable mt-2 flex items-center gap-2 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black"
      >
        Find another match
        <Icons.ArrowUpRight className="h-4 w-4" />
      </motion.button>
    </motion.div>
  );
}

function ConversationRow({ convo, onClick }) {
  const s = Store.useStore();
  const blocked = convo.status === "blocked";
  // Reflects whatever this session already knows — the exchange for a
  // conversation only gets fetched once it's been opened, so a never-opened
  // thread still shows the handle until then.
  const exRaw = s.exchanges.find((x) => x.conversationId === convo.conversationId);
  const revealedPeer = exRaw && exRaw.status === "done" ? exRaw.peer : null;
  const displayName = revealedPeer ? revealedPeer.fullName : convo.peerHandle;
  return (
    <button
      type="button"
      onClick={onClick}
      className="tappable flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-white/5"
    >
      <div className={blocked ? "opacity-50" : ""}>
        <Avatar handle={convo.peerHandle} name={displayName} size="md" />
      </div>
      <div className={"min-w-0 flex-1 " + (blocked ? "opacity-50" : "")}>
        <p className="truncate font-heading text-base italic leading-none text-white">{displayName}</p>
        <p className="mt-1 truncate font-body text-[12px] font-light text-white/45">
          {blocked ? "Conversation closed" : convo.fusionLabel || "Fusing together"}
        </p>
      </div>
      {blocked && <Icons.Lock className="h-3.5 w-3.5 shrink-0 text-white/30" />}
    </button>
  );
}

// The DM inbox — every conversation the viewer has, most recent first.
function ConversationList({ onFindPeer }) {
  const s = Store.useStore();
  const sorted = [...s.conversations].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

  return (
    <div className="liquid-glass mt-4 overflow-hidden rounded-[1.5rem]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/40">Your conversations</p>
        <button
          type="button"
          onClick={onFindPeer}
          className="tappable font-body text-[12px] font-medium text-white/70 transition-colors hover:text-white"
        >
          + Find a peer
        </button>
      </div>
      <div className="flex flex-col gap-1 p-2">
        {sorted.length === 0 && (
          <p className="px-4 py-6 text-center font-body text-[13px] font-light text-white/40">
            No conversations yet — find a peer to get started.
          </p>
        )}
        {sorted.map((c) => (
          <ConversationRow key={c.conversationId} convo={c} onClick={() => Store.openConversation(c.conversationId)} />
        ))}
      </div>
    </div>
  );
}

// One open conversation: header (with the report menu), the chat, and the
// exchange pill. Takes over the whole private-room view while open.
function ConversationDetail({ convo, onBack }) {
  const s = Store.useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const blocked = convo.status === "blocked";
  // Once both sides have confirmed the identity exchange, the anonymous
  // handle gives way to the real name everywhere in this thread — this
  // state is shared across the app (ExchangePanel's effect fetches it), so
  // it just needs reading here, not fetching again.
  const exRaw = s.exchanges.find((x) => x.conversationId === convo.conversationId);
  const revealedPeer = exRaw && exRaw.status === "done" ? exRaw.peer : null;
  const displayName = revealedPeer ? revealedPeer.fullName : convo.peerHandle;

  async function doReportPeer() {
    try {
      await Store.reportPeer(convo.peerHandle);
      setMenuOpen(false);
      window.Toast.show("Reported — conversation closed", "success");
    } catch (e) {
      window.Toast.show(e.message || "Couldn't report that peer", "error");
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={onBack}
        className="tappable mb-4 flex items-center gap-1.5 font-body text-[12px] font-medium text-white/50 transition-colors hover:text-white"
      >
        <Icons.ArrowLeft className="h-3.5 w-3.5" />
        All conversations
      </button>
      {/* The dropdown is a sibling of the liquid-glass card, not nested
          inside it — that class sets overflow:hidden (for its edge-glow
          effect), which was clipping almost the entire menu to a sliver. */}
      <div className="relative">
        <div className="liquid-glass flex items-center justify-between rounded-[1.5rem] p-5">
          <div className="flex items-center gap-4">
            <Avatar handle={convo.peerHandle} name={displayName} size="lg" />
            <div>
              <p className="font-heading text-xl italic leading-none text-white">{displayName}</p>
              <p className="mt-1 font-body text-xs font-light text-white/50">
                {blocked ? "Conversation closed" : revealedPeer ? revealedPeer.email : convo.fusionLabel || "Private conversation"}
              </p>
            </div>
          </div>
          {!blocked && (
            <button
              type="button"
              aria-label="Report menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="tappable flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Icons.Dots className="h-4 w-4" />
            </button>
          )}
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="liquid-glass-strong absolute right-0 top-full z-20 mt-2 w-48 rounded-2xl p-1.5"
            >
              <button
                type="button"
                onClick={doReportPeer}
                className="tappable flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left font-body text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
              >
                <Icons.Flag className="h-4 w-4 text-white/60" />
                Report {displayName}
              </button>
              <p className="px-3 pb-1.5 pt-1 font-body text-[11px] font-light text-white/40">
                Reports are private and reviewed by our team.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <PrivateChat conversationId={convo.conversationId} readOnly={blocked} peerDisplayName={displayName} />
      <ExchangePanel
        peer={{ handle: convo.peerHandle, fusionLabel: convo.fusionLabel }}
        conversationId={convo.conversationId}
        disabled={blocked}
      />
    </div>
  );
}

const PRIVATE_TABS = [
  ["conversations", "Conversations"],
  ["requests", "Requests"],
];

function ConnectPrivateRoom() {
  const s = Store.useStore();
  const peer = s.privatePeer;
  // Whichever sub-tab already has something to show when this view first
  // mounts wins — e.g. landing here with an incoming request waiting should
  // show it immediately, not hide it behind an extra click.
  const [tab, setTab] = useState(() => (s.matchStatus === "none" ? "conversations" : "requests"));
  const activeConvo = s.conversations.find((c) => c.conversationId === s.activeConversationId);
  const hasIncomingRequest = s.matchStatus === "requested" && s.matchDirection === "incoming";

  useEffect(() => {
    Store.loadConversations().catch(() => {});
  }, []);

  function backToList() {
    Store.closeConversationView();
  }

  const pendingContent =
    s.matchStatus === "waiting" ? (
      <WaitingForMatch />
    ) : s.matchStatus === "requested" && s.matchDirection === "outgoing" && peer ? (
      <WaitingForAccept peer={peer} />
    ) : s.matchStatus === "requested" && s.matchDirection === "incoming" && peer ? (
      <IncomingRequest peer={peer} onRespond={(action) => Store.respondToMatch(action)} />
    ) : s.matchStatus === "closed" ? (
      <ClosedNote reason={s.matchCloseReason} direction={s.matchDirection} onFindAnother={() => Store.dismissClosedMatch()} />
    ) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 font-body text-[11px] font-medium text-white/85">
          <Icons.Lock className="h-3.5 w-3.5" />
          Private room · your conversations
        </span>
        <p className="font-body text-sm font-light leading-relaxed text-white/60">
          Every conversation here stays — pick up right where you left off.
        </p>
      </div>

      {activeConvo ? (
        <ConversationDetail convo={activeConvo} onBack={backToList} />
      ) : (
        <>
          <div className="mt-8 flex justify-center gap-1.5">
            {PRIVATE_TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={
                  (tab === key ? "bg-white text-black" : "liquid-glass text-white/85 hover:text-white") +
                  " tappable relative flex items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm font-medium transition-colors"
                }
              >
                {label}
                {key === "requests" && hasIncomingRequest && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--color-status-active)]" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {tab === "conversations" ? (
              <ConversationList onFindPeer={() => setTab("requests")} />
            ) : (
              pendingContent || <FindMatch />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Connect() {
  const [room, setRoom] = useState("open");
  const s = Store.useStore();
  const fusion = s.fusions[0];
  const hasIncomingRequest = s.matchStatus === "requested" && s.matchDirection === "incoming";

  useEffect(() => {
    Store.loadConnectProfile().catch(() => {});
  }, []);

  // Page ambient follows the signed-in user's fusion colors, same as every
  // other tab — peer messages tint their own bubbles, never the background.
  useEffect(() => {
    if (fusion) window.Ambient.setFusion(fusion.a, fusion.b);
    else window.Ambient.clear();
  }, [fusion?.id]);

  // Polls for the viewer's own match situation regardless of which tab
  // they're on — this is the only way an incoming chat request (someone
  // else clicked "Message privately" on them) ever gets discovered.
  useEffect(() => {
    Store.loadMyMatch().catch(() => {});
    const t = setInterval(() => Store.loadMyMatch().catch(() => {}), MATCH_POLL_MS);
    return () => clearInterval(t);
  }, []);

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
              " tappable relative flex items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm font-medium transition-colors"
            }
          >
            {key === "open" ? <Icons.Users className="h-4 w-4" /> : <Icons.Lock className="h-4 w-4" />}
            {label}
            {key === "private" && hasIncomingRequest && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--color-status-active)]" />
            )}
          </button>
        ))}
      </motion.div>

      <div className="mt-8">
        <AnimatePresence mode="wait">
          {room === "open" ? (
            <motion.div key="open" {...enter(0.12)}>
              <ConnectOpenRoom onOpenPrivate={() => setRoom("private")} />
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
