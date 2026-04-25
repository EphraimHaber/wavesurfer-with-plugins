import { motion } from "motion/react";

export function Hero() {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative pb-6 mb-8 border-b border-rule"
    >
      <div className="ornament-rule mb-3 font-mono text-[0.66rem] tracking-[0.22em] uppercase text-ink-soft">
        <span>Vol. I &middot; Plugin Almanac &middot; MMXXVI</span>
      </div>
      <h1
        className="font-display font-medium text-ink m-0 leading-[0.96] tracking-[-0.012em] text-[clamp(2.4rem,6vw,4.8rem)]"
        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 0, "wght" 500' }}
      >
        WaveSurfer
        <span
          className="text-ochre italic px-1"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 400' }}
        >
          &amp;
        </span>
        its Plugins
      </h1>
      <p
        className="mt-3 italic font-display text-ink-soft max-w-[60ch] m-0 text-[clamp(1.05rem,1.6vw,1.25rem)]"
        style={{ fontVariationSettings: '"opsz" 14, "SOFT" 100' }}
      >
        A field-notebook of nine instruments for visualising, dissecting, and
        annotating audio in the browser.
      </p>
    </motion.header>
  );
}
