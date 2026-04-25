import { CodeBlock } from "./CodeBlock";

export function PluginCard({
  title,
  description,
  code,
  folio,
  children,
}: {
  title: string;
  description: string;
  code: string;
  folio: string;
  children: React.ReactNode;
}) {
  return (
    <article className="relative bg-paper-2 border border-rule rounded-paper overflow-hidden min-h-[72vh] shadow-lift">
      <div className="tape-ribbon" aria-hidden />
      <header className="relative pt-8 px-6 pb-3 border-b border-rule-soft flex items-end gap-4">
        <div className="flex-1 min-w-0">
          <h2
            className="font-display font-medium leading-[1.05] text-ink m-0 mb-1 tracking-[-0.005em] text-[clamp(1.6rem,3vw,2.2rem)]"
            style={{ fontVariationSettings: '"opsz" 60, "SOFT" 0' }}
          >
            {title}
          </h2>
          <p
            className="m-0 italic font-display text-base text-ink-soft"
            style={{ fontVariationSettings: '"opsz" 14, "SOFT" 80' }}
          >
            {description}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-ink-mute shrink-0 leading-tight">
          <span
            className="font-display italic text-[1.7rem] leading-none text-ochre"
            style={{ fontVariationSettings: '"opsz" 60, "SOFT" 100' }}
          >
            {folio}
          </span>
          <span>folio</span>
        </div>
      </header>
      <div className="px-6 py-5">{children}</div>
      <CodeBlock code={code} />
    </article>
  );
}
