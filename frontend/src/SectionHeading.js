const { Reveal } = window;

function SectionHeading({ kicker, title, className = "" }) {
  return (
    <div className={className}>
      {kicker && (
        <Reveal>
          <p className="mb-6 font-body text-sm text-white/80">// {kicker}</p>
        </Reveal>
      )}
      <Reveal delay={0.12}>
        <h2 className="font-heading text-5xl italic leading-[1.0] tracking-[-3px] text-white md:text-6xl lg:text-7xl">
          {title}
        </h2>
      </Reveal>
    </div>
  );
}

window.SectionHeading = SectionHeading;
