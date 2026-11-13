const { useState, useEffect, useRef } = React;
const { motion } = window.Motion;
const { Icons } = window;
const Store = window.Store;

// US Letter @ 96dpi — matches backend/resume/pdf.py's PX_TO_PT conversion
// (816x1056px * 0.75 = 612x792pt), so what's shown here is what exports.
const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;
const MIN_WIDTH = 60;
const MIN_HEIGHT = 24;
const AUTOSAVE_MS = 800;
// The printable area blocks are constrained to — matches the x:48/y:48 start
// every preset already uses, so a freshly-seeded layout starts flush with
// the boundary rather than visibly inside it. Content dragged or resized
// past this line would print outside the page in the PDF export (which
// uses this exact page size), so it's a hard clamp, not just a guide.
const MARGIN_SIDE = 48;
const MARGIN_HEADER = 48;
const MARGIN_FOOTER = 48;

const enter = window.MotionKit.enter;

// {handle: [widthSign, heightSign, xMoves, yMoves]} — SE only grows; the
// others also shift x/y since their opposite corner stays anchored.
const RESIZE_HANDLES = {
  se: { dw: 1, dh: 1, moveX: false, moveY: false },
  sw: { dw: -1, dh: 1, moveX: true, moveY: false },
  ne: { dw: 1, dh: -1, moveX: false, moveY: true },
  nw: { dw: -1, dh: -1, moveX: true, moveY: true },
};

function ResumeCanvas({ id }) {
  const s = Store.useStore();
  const [doc, setDoc] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const saveTimerRef = useRef(null);
  const blocksRef = useRef(blocks);
  const docRef = useRef(doc);

  // Refs are only for event handlers/effects to read the latest value
  // without re-subscribing — mutating them during render itself isn't
  // allowed, so this runs as an effect after every render instead.
  useEffect(() => {
    blocksRef.current = blocks;
    docRef.current = doc;
  });

  useEffect(() => {
    window.Api
      .listResumeDocuments()
      .then((docs) => {
        const found = (docs || []).find((d) => d.documentId === id);
        if (!found) return;
        setDoc(found);
        const saved = found.layout && found.layout.blocks;
        setBlocks(saved && saved.length ? saved : window.ResumePresets.classic(found, s.user));
      })
      .catch(() => {});
    // eslint-disable-next-line
  }, [id]);

  function scheduleSave(nextBlocks) {
    // Initial load calls setBlocks() directly (above), never this function,
    // so there's no "don't save on mount" case to guard against here.
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(nextBlocks), AUTOSAVE_MS);
  }

  function doSave(nextBlocks) {
    if (!docRef.current) return;
    setSaveState("saving");
    window.Api
      .saveResumeLayout(docRef.current.documentId, { blocks: nextBlocks })
      .then(() => setSaveState("saved"))
      .catch((e) => {
        setSaveState("error");
        window.Toast.show((e && e.message) || "Couldn't save your changes", "error");
      });
  }

  // Flush any pending debounced save when leaving the editor, so a fast
  // navigate-away doesn't silently drop the last ~800ms of changes.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        doSave(blocksRef.current);
      }
    };
  }, []);

  function updateBlock(blockId, patch, opts = {}) {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === blockId ? { ...b, ...patch } : b));
      if (!opts.skipSave) scheduleSave(next);
      return next;
    });
  }

  function bringToFront(blockId) {
    setSelectedId(blockId);
    setBlocks((prev) => {
      const maxZ = Math.max(0, ...prev.map((b) => b.zIndex || 0));
      return prev.map((b) => (b.id === blockId && b.zIndex !== maxZ + 1 ? { ...b, zIndex: maxZ + 1 } : b));
    });
  }

  function startDrag(e, block) {
    e.stopPropagation();
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY, blockX: block.x, blockY: block.y };
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    // Clamped against the block's own (unchanged-during-drag) size, so it
    // can be slid right up to the margin but never past it.
    const maxX = Math.max(MARGIN_SIDE, PAGE_WIDTH - MARGIN_SIDE - block.width);
    const maxY = Math.max(MARGIN_HEADER, PAGE_HEIGHT - MARGIN_FOOTER - block.height);

    function onMove(ev) {
      const x = Math.min(Math.max(start.blockX + (ev.clientX - start.x), MARGIN_SIDE), maxX);
      const y = Math.min(Math.max(start.blockY + (ev.clientY - start.y), MARGIN_HEADER), maxY);
      updateBlock(block.id, { x, y }, { skipSave: true });
    }
    function onUp() {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      scheduleSave(blocksRef.current);
    }
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
  }

  function startResize(e, block, handle) {
    e.stopPropagation();
    e.preventDefault();
    const { dw, dh, moveX, moveY } = RESIZE_HANDLES[handle];
    const start = { x: e.clientX, y: e.clientY, width: block.width, height: block.height, blockX: block.x, blockY: block.y };
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    // Which corner is anchored (fixed) determines how far the opposite edge
    // can grow before it crosses the margin on that side.
    const maxWidth = Math.max(MIN_WIDTH, moveX
      ? start.blockX + start.width - MARGIN_SIDE
      : PAGE_WIDTH - MARGIN_SIDE - start.blockX);
    const maxHeight = Math.max(MIN_HEIGHT, moveY
      ? start.blockY + start.height - MARGIN_HEADER
      : PAGE_HEIGHT - MARGIN_FOOTER - start.blockY);

    function onMove(ev) {
      const dx = (ev.clientX - start.x) * dw;
      const dy = (ev.clientY - start.y) * dh;
      const width = Math.min(Math.max(MIN_WIDTH, start.width + dx), maxWidth);
      const height = Math.min(Math.max(MIN_HEIGHT, start.height + dy), maxHeight);
      const patch = { width, height };
      if (moveX) patch.x = start.blockX + (start.width - width);
      if (moveY) patch.y = start.blockY + (start.height - height);
      updateBlock(block.id, patch, { skipSave: true });
    }
    function onUp() {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      scheduleSave(blocksRef.current);
    }
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
  }

  function resetToPreset(key) {
    if (!window.confirm("Start over with this design? Your current layout will be replaced.")) return;
    const next = window.ResumePresets[key](doc, s.user);
    setBlocks(next);
    scheduleSave(next);
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="font-body text-sm text-white/60">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div {...enter()} className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => window.Router.go("/resume")}
            className="tappable flex items-center gap-2 font-body text-sm text-white/60 transition-colors hover:text-white"
          >
            <Icons.ArrowLeft className="h-4 w-4" />
            Back to Resume
          </button>
          <h1 className="mt-2 font-heading text-3xl italic text-white">Layout Editor</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-body text-xs text-white/40">
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Couldn't save" : ""}
          </p>
          <div className="liquid-glass flex items-center gap-1 rounded-full p-1">
            {Object.keys(window.ResumePresets).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => resetToPreset(key)}
                className="tappable rounded-full px-3 py-1.5 font-body text-xs font-medium capitalize text-white/70 transition-colors hover:text-white"
              >
                {key}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => window.Api.downloadResumeExport(doc.documentId, "resume", "resume.pdf")}
            className="tappable flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-body text-sm font-medium text-black"
          >
            <Icons.Download className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </motion.div>

      <div className="flex justify-center overflow-x-auto pb-10">
        <div
          onPointerDown={() => {
            setSelectedId(null);
            setEditingId(null);
          }}
          style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, position: "relative" }}
          className="shrink-0 rounded-sm bg-[var(--color-paper)] shadow-[var(--shadow-paper)]"
        >
          {/* Printable-area guide — purely visual (pointer-events: none),
              the actual boundary is enforced in startDrag/startResize. */}
          <div
            style={{
              position: "absolute",
              left: MARGIN_SIDE,
              top: MARGIN_HEADER,
              right: MARGIN_SIDE,
              bottom: MARGIN_FOOTER,
              border: "1px dashed rgba(0,0,0,0.15)",
              pointerEvents: "none",
            }}
          />
          {blocks.map((block) => (
            <ResumeBlock
              key={block.id}
              block={block}
              selected={selectedId === block.id}
              editing={editingId === block.id}
              onSelect={() => bringToFront(block.id)}
              onEdit={() => {
                bringToFront(block.id);
                setEditingId(block.id);
              }}
              onBlurEdit={() => setEditingId(null)}
              onChangeContent={(content) => updateBlock(block.id, { content })}
              onGripPointerDown={(e) => startDrag(e, block)}
              onResizeHandlePointerDown={(e, handle) => startResize(e, block, handle)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ResumeBlock({ block, selected, editing, onSelect, onEdit, onBlurEdit, onChangeContent, onGripPointerDown, onResizeHandlePointerDown }) {
  const alignClass = block.align === "center" ? "text-center" : block.align === "right" ? "text-right" : "text-left";
  const textStyle = {
    fontSize: block.fontSize || 12,
    fontWeight: block.fontWeight === "bold" ? 700 : 400,
    lineHeight: 1.3,
  };

  return (
    <div
      style={{
        position: "absolute",
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        zIndex: block.zIndex || 1,
      }}
      className={
        "rounded-sm " + (selected ? "ring-2 ring-black/40" : "ring-1 ring-black/0 hover:ring-black/15")
      }
    >
      {/* The only drag-initiation surface — plain pointer events (not
          Framer Motion's `drag`, which never fires for synthetic/CDP-driven
          pointer input, confirmed via Playwright: zero onDragStart/onDrag
          events logged despite real mouse movement). Same mechanism the
          resize handles already use below. Lives OUTSIDE the overflow-hidden
          text wrapper below — clipping the whole block (not just its text)
          clipped the grip itself out of the hit-testable area too. */}
      {selected && (
        <div
          onPointerDown={onGripPointerDown}
          className="absolute -top-6 left-0 flex cursor-grab items-center gap-1 rounded-t-sm bg-black/80 px-2 py-1 text-white active:cursor-grabbing"
        >
          <Icons.Dots className="h-3 w-3" />
        </div>
      )}

      {editing ? (
        <textarea
          autoFocus
          value={block.content}
          onChange={(e) => onChangeContent(e.target.value)}
          onBlur={onBlurEdit}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ ...textStyle, color: "#111" }}
          className={"h-full w-full resize-none overflow-hidden bg-white/60 p-2 font-body outline-none " + alignClass}
        />
      ) : (
        <div
          // First click selects (reveals the grip handle + resize corners)
          // without entering edit — matches how Figma itself behaves.
          // Clicking again while already selected is what enters edit mode;
          // otherwise selecting a block would always edit it too, and the
          // resize handles (shown only when selected-but-not-editing) could
          // never actually appear.
          onClick={() => (selected ? onEdit() : onSelect())}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ ...textStyle, color: "#111", whiteSpace: "pre-wrap" }}
          className={"h-full w-full overflow-hidden cursor-text p-2 font-body " + alignClass}
        >
          {block.content}
        </div>
      )}

      {selected && !editing && (
        <>
          {["nw", "ne", "sw", "se"].map((handle) => (
            <div
              key={handle}
              onPointerDown={(e) => onResizeHandlePointerDown(e, handle)}
              style={{
                position: "absolute",
                width: 10,
                height: 10,
                background: "#000",
                top: handle.includes("n") ? -5 : "auto",
                bottom: handle.includes("s") ? -5 : "auto",
                left: handle.includes("w") ? -5 : "auto",
                right: handle.includes("e") ? -5 : "auto",
                cursor: (handle === "nw" || handle === "se") ? "nwse-resize" : "nesw-resize",
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

window.ResumeCanvas = ResumeCanvas;
