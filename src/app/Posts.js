const { useState, useEffect } = React;
const { motion, AnimatePresence } = window.Motion;
const { Icons } = window;
const F = window.Fusion;
const Store = window.Store;

const TONES = ["Professional", "Warm", "Punchy"];

const enter = window.MotionKit.enter;

function StatusBadge({ status }) {
  const map = {
    draft: ["Draft", "text-white/60 border border-white/20"],
    queued: ["Queued", "liquid-glass text-white/80"],
    shared: ["Shared", "bg-white text-black"],
  };
  const [label, cls] = map[status] || map.draft;
  return <span className={`rounded-full px-3 py-1 font-body text-[11px] font-semibold ${cls}`}>{label}</span>;
}

function Posts({ entryId }) {
  const s = Store.useStore();
  const entries = s.logEntries.slice(0, 6);
  const [selectedId, setSelectedId] = useState(entryId || null);
  const [tone, setTone] = useState("Warm");
  const [salt, setSalt] = useState(0);
  const [draft, setDraft] = useState(null);

  const selected = entries.find((e) => e.id === selectedId) || null;

  const scanEntries = entries.map((e) => {
    const fusion = e.fusionId ? s.fusions.find((f) => f.id === e.fusionId) : null;
    if (fusion) return { key: e.id, a: F.colorOf(fusion.a), b: F.colorOf(fusion.b) };
    const tag = (e.tags || []).find((t) => t.kind === "skill");
    const c = F.colorOf(tag ? tag.label : "Skill A");
    return { key: e.id, a: c, b: c };
  });
  const pickRefs = window.Ambient.useAmbient(scanEntries);

  useEffect(() => {
    const f = scanEntries.find((x) => x.key === selectedId);
    if (f) window.Ambient.setHex(f.a, f.b);
    else if (scanEntries[0]) window.Ambient.setHex(scanEntries[0].a, scanEntries[0].b);
  }, [selectedId]);

  function pick(entry) {
    setSelectedId(entry.id);
    setTone("Warm");
    setSalt(0);
    const id = Store.draftPost(entry, "Warm", 0);
    const post = Store.getSnapshot().posts.find((p) => p.id === id);
    setDraft({ id, text: post.text, tone: "Warm" });
  }

  function setToneAndRedraft(t) {
    if (!selected || !draft) return;
    setTone(t);
    const id = Store.draftPost(selected, t, salt);
    const post = Store.getSnapshot().posts.find((p) => p.id === id);
    setDraft({ id, text: post.text, tone: t });
  }

  function redraft() {
    if (!selected || !draft) return;
    const next = salt + 1;
    setSalt(next);
    const id = Store.draftPost(selected, tone, next);
    const post = Store.getSnapshot().posts.find((p) => p.id === id);
    setDraft({ id, text: post.text, tone });
  }

  function share() {
    if (!draft) return;
    Store.savePost(draft.id, "shared");
    window.Toast.show("Post shared", "success");
  }

  function queue() {
    if (!draft) return;
    Store.savePost(draft.id, "queued");
    window.Toast.show("Queued for later", "success");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div {...enter()}>
        <h1 className="mt-3 font-heading text-5xl italic leading-[1.0] tracking-[-3px] text-white md:text-6xl">
          Auto Posts
        </h1>
      </motion.div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <motion.div {...enter(0.05)} className="flex flex-col gap-2">
          <p className="mb-1 font-body text-[11px] uppercase tracking-[0.18em] text-white/50">
            Pick an entry
          </p>
          {entries.map((e, i) => {
            const fusion = e.fusionId ? s.fusions.find((f) => f.id === e.fusionId) : null;
            const on = e.id === selectedId;
            return (
              <button
                key={e.id}
                ref={pickRefs[i]}
                type="button"
                onClick={() => pick(e)}
                className={
                  (on ? "bg-white text-black" : "liquid-glass text-white/85 hover:text-white") +
                  " tappable rounded-2xl px-4 py-3 text-left transition-colors"
                }
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-heading text-base italic">{e.title}</span>
                  <span className="shrink-0 font-body text-[11px] font-light opacity-60">{e.date}</span>
                </span>
                {fusion && (
                  <span className="mt-1.5 flex items-center gap-2">
                    <F.FusionChip a={fusion.a} b={fusion.b} size="sm" />
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>

        <div>
          {!selected ? (
            <motion.div {...enter(0.1)} className="liquid-glass flex min-h-[280px] items-center justify-center rounded-[1.5rem] text-center">
              <p className="font-body text-sm font-light text-white/50">
                Pick a Growth Log entry to draft a post from it.
              </p>
            </motion.div>
          ) : (
            <motion.div key={selectedId} {...enter(0.1)} className="liquid-glass-strong rounded-[1.5rem] p-8 md:p-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-heading text-xl italic text-white">{selected.title}</p>
                <span className="font-body text-xs font-light text-white/50">{draft ? draft.text.length : 0} chars</span>
              </div>

              <textarea
                value={draft ? draft.text : ""}
                onChange={(e) => setDraft((d) => (d ? { ...d, text: e.target.value } : d))}
                rows={6}
                className="mt-4 w-full rounded-xl bg-black/40 px-4 py-3 font-body text-sm text-white outline-none ring-1 ring-white/15 focus:ring-white/40"
              />

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Tone</span>
                {TONES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setToneAndRedraft(t)}
                    className={
                      (tone === t ? "bg-white text-black" : "liquid-glass text-white/85 hover:text-white") +
                      " tappable rounded-full px-3.5 py-1.5 font-body text-xs font-medium transition-colors"
                    }
                  >
                    {t}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-3">
                  <button
                    type="button"
                    onClick={redraft}
                    className="tappable flex items-center gap-1.5 font-body text-sm text-white/70 transition-colors hover:text-white"
                  >
                    <Icons.Refresh className="h-4 w-4" />
                    Draft again
                  </button>
                  <button
                    type="button"
                    onClick={queue}
                    className="tappable liquid-glass-strong flex items-center gap-2 rounded-full px-4 py-2 font-body text-sm font-medium text-white"
                  >
                    Queue
                  </button>
                  <button
                    type="button"
                    onClick={share}
                    className="tappable flex items-center gap-2 rounded-full bg-white px-5 py-2 font-body text-sm font-medium text-black"
                  >
                    Share
                    <Icons.Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <motion.div {...enter(0.15)} className="mt-12">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Post history</p>
        <div className="mt-3 flex flex-col gap-2">
          {s.posts.length === 0 && (
            <p className="font-body text-sm font-light text-white/50">Nothing posted yet.</p>
          )}
          {s.posts.map((p) => {
            const e = s.logEntries.find((x) => x.id === p.entryId);
            return (
              <div key={p.id} className="liquid-glass flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate font-body text-sm text-white/85">{p.text.split("\n\n")[0]}</p>
                  <p className="mt-0.5 truncate font-body text-xs font-light text-white/45">
                    {e ? e.title : "Entry"} · {p.tone}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

window.Posts = Posts;
