const { useReducedMotion } = window.Motion;

const enter = (delay = 0, opts = {}) => ({
  initial: { filter: `blur(${opts.blur ?? 6}px)`, opacity: 0, y: opts.y ?? 22 },
  animate: { filter: "blur(0px)", opacity: 1, y: 0 },
  transition: { duration: opts.duration ?? 0.6, ease: "easeOut", delay },
});

window.MotionKit = { enter, useReducedMotion };