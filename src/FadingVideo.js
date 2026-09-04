const { useEffect, useRef } = React;

function FadingVideo({ src, className, style, fadeMs = 500, fadeOutLead = 0.55 }) {
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const fadingOutRef = useRef(false);

  const fadeTo = (target, duration) => {
    const el = videoRef.current;
    if (!el) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const from = parseFloat(el.style.opacity) || 0;
    const diff = target - from;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      el.style.opacity = from + diff * t;
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onLoadedData = () => {
      el.style.opacity = 0;
      el.play().catch(() => {});
      fadeTo(1, fadeMs);
    };
    const onTimeUpdate = () => {
      const remaining = el.duration - el.currentTime;
      if (!fadingOutRef.current && remaining <= fadeOutLead && remaining > 0) {
        fadingOutRef.current = true;
        fadeTo(0, fadeMs);
      }
    };
    const onEnded = () => {
      el.style.opacity = 0;
      setTimeout(() => {
        el.currentTime = 0;
        el.play().catch(() => {});
        fadingOutRef.current = false;
        fadeTo(1, fadeMs);
      }, 100);
    };

    el.addEventListener("loadeddata", onLoadedData);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", onEnded);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      el.removeEventListener("loadeddata", onLoadedData);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", onEnded);
    };
  }, [fadeMs, fadeOutLead]);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      muted
      playsInline
      preload="auto"
      className={className}
      style={{ opacity: 0, ...style }}
    />
  );
}

window.FadingVideo = FadingVideo;
