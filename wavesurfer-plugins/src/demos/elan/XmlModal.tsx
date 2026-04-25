import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { Highlight } from "prism-react-renderer";
import { usePrefersColorSchemeDark } from "../../hooks/usePrefersColorSchemeDark";
import {
  MONO_FONT,
  XML_VIEWER_THEME_DARK,
  XML_VIEWER_THEME_LIGHT,
} from "../../lib/xmlViewerTheme";

export function XmlModal({
  open,
  xml,
  onClose,
}: {
  open: boolean;
  xml: string | null;
  onClose: () => void;
}) {
  const dark = usePrefersColorSchemeDark();
  const theme = dark ? XML_VIEWER_THEME_DARK : XML_VIEWER_THEME_LIGHT;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-1000 flex items-center justify-center p-3 bg-ink/55 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex flex-col w-[min(1400px,98vw)] h-[min(94vh,100%)] max-w-[98vw] max-h-[94vh] rounded-paper border border-rule bg-paper shadow-lift overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="elan-xml-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-rule shrink-0">
              <div className="flex items-baseline gap-3">
                <h2
                  id="elan-xml-title"
                  className="font-display font-medium text-ink m-0 text-[1.2rem]"
                  style={{ fontVariationSettings: '"opsz" 60' }}
                >
                  ELAN XML
                </h2>
                <span className="font-mono text-[0.66rem] tracking-[0.16em] uppercase text-ochre">
                  live document
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-paper bg-cream text-ink border border-ink font-mono text-[0.7rem] uppercase tracking-[0.08em] hover:bg-ink hover:text-cream transition"
              >
                <X size={14} strokeWidth={1.75} />
                Close
              </button>
            </header>
            <div className="xml-body flex-1 min-h-0 px-5 py-4 overflow-auto text-[0.95rem] leading-[1.55]">
              {xml ? (
                <Highlight code={xml} language="markup" theme={theme}>
                  {({
                    className,
                    style,
                    tokens,
                    getLineProps,
                    getTokenProps,
                  }) => (
                    <pre
                      className={`${className} m-0 bg-transparent`}
                      style={{ ...style, fontFamily: MONO_FONT }}
                    >
                      {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })}>
                          {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                          ))}
                        </div>
                      ))}
                    </pre>
                  )}
                </Highlight>
              ) : (
                <p className="m-0 italic font-display text-ink-soft">
                  No XML loaded yet.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
