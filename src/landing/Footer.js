const Footer = () => (
  <footer className="relative w-full border-t border-white/10 bg-black py-14">
    <div className="px-8 md:px-16 lg:px-20">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <a href="#top" className="flex items-center gap-3" aria-label="Skill Fusion AI home">
            <span className="liquid-glass flex h-10 w-10 items-center justify-center rounded-full font-heading text-xl italic text-white">
              s
            </span>
            <span className="font-heading text-lg italic text-white">Skill Fusion AI</span>
          </a>
          <p className="mt-4 max-w-[28ch] font-body text-xs font-light leading-relaxed text-white/60">
            Fuse two skills into a rare career. Personalized roadmaps, real projects, verified scores.
          </p>
        </div>

        <FooterCol
          title="Product"
          links={[
            ["Try a Fusion", "#demo"],
            ["How It Works", "#how-it-works"],
            ["Features", "#capabilities"],
            ["Fusion Score", "#score"],
            ["Pricing", "#pricing"],
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            ["Community", "#community"],
            ["FAQ", "#faq"],
            ["Blog", "#top"],
            ["Careers", "#top"],
            ["Contact", "#top"],
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            ["Privacy", "#top"],
            ["Terms", "#top"],
            ["License", "#top"],
          ]}
        />
      </div>

      <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 md:flex-row md:items-center">
        <p className="font-body text-[11px] font-light text-white/50">
          © {new Date().getFullYear()} Skill Fusion AI. All rights reserved.
        </p>
        <p className="font-body text-[11px] font-light text-white/40">
          Background footage: Mixkit, free license · Made with React + Framer Motion
        </p>
      </div>
    </div>
  </footer>
);

function FooterCol({ title, links }) {
  return (
    <div>
      <p className="mb-4 font-body text-[11px] uppercase tracking-[0.18em] text-white/50">{title}</p>
      <ul className="flex flex-col gap-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <a href={href} className="font-body text-sm font-light text-white/70 transition-colors hover:text-white">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

window.Footer = Footer;
