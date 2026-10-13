const { useEffect, useRef, useState } = React;
const { motion } = window.Motion;

function BlurText({ text, className, delay = 0 }) {
  const words = text.split(" ");
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <motion.p
      ref={ref}
      className={className}
      style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", rowGap: "0.1em" }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ filter: "blur(6px)", opacity: 0, y: 50 }}
          animate={
            inView
              ? {
                  filter: ["blur(6px)", "blur(5px)", "blur(0px)"],
                  opacity: [0, 0.5, 1],
                  y: [50, -5, 0],
                  transition: {
                    duration: 0.7,
                    times: [0, 0.5, 1],
                    ease: "easeOut",
                    delay: delay + (i * 100) / 1000,
                  },
                }
              : undefined
          }
          style={{ display: "inline-block", marginRight: "0.28em" }}
        >
          {word}
        </motion.span>
      ))}
    </motion.p>
  );
}

window.BlurText = BlurText;
