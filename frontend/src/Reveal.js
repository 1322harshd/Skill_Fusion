const { motion } = window.Motion;

function Reveal({ children, className, delay = 0, y = 30, amount = 0.25, blur = true, once = true }) {
  return (
    <motion.div
      className={className}
      initial={{ filter: blur ? "blur(6px)" : "blur(0px)", opacity: 0, y }}
      whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.7, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

window.Reveal = Reveal;
