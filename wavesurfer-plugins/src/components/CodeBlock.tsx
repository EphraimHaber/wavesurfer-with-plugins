import { Highlight, type PrismTheme } from "prism-react-renderer";
import { usePrefersColorSchemeDark } from "../hooks/usePrefersColorSchemeDark";

const codeThemeLight: PrismTheme = {
  plain: { color: "#1a1410", backgroundColor: "transparent" },
  styles: [
    { types: ["comment", "prolog", "doctype", "cdata"], style: { color: "#7a6b59", fontStyle: "italic" } },
    { types: ["keyword", "operator", "module", "selector", "atrule"], style: { color: "#b25a1f" } },
    { types: ["string", "char", "attr-value", "regex"], style: { color: "#4f7560" } },
    { types: ["number", "boolean", "constant"], style: { color: "#7a1f1f" } },
    { types: ["function", "method", "class-name", "maybe-class-name"], style: { color: "#1a1410", fontWeight: "600" } },
    { types: ["punctuation"], style: { color: "#4a3f33" } },
    { types: ["variable", "parameter"], style: { color: "#1a1410" } },
    { types: ["tag", "attr-name"], style: { color: "#b25a1f" } },
    { types: ["builtin", "symbol"], style: { color: "#c89b3f" } },
  ],
};

const codeThemeDark: PrismTheme = {
  plain: { color: "#efe7d4", backgroundColor: "transparent" },
  styles: [
    { types: ["comment", "prolog", "doctype", "cdata"], style: { color: "#8a7e69", fontStyle: "italic" } },
    { types: ["keyword", "operator", "module", "selector", "atrule"], style: { color: "#e89249" } },
    { types: ["string", "char", "attr-value", "regex"], style: { color: "#aac6b6" } },
    { types: ["number", "boolean", "constant"], style: { color: "#c46161" } },
    { types: ["function", "method", "class-name", "maybe-class-name"], style: { color: "#efe7d4", fontWeight: "600" } },
    { types: ["punctuation"], style: { color: "#b8ad97" } },
    { types: ["variable", "parameter"], style: { color: "#efe7d4" } },
    { types: ["tag", "attr-name"], style: { color: "#e89249" } },
    { types: ["builtin", "symbol"], style: { color: "#e0bd6a" } },
  ],
};

export function CodeBlock({
  code,
  language = "tsx",
  label = "specimen",
}: {
  code: string;
  language?: string;
  label?: string;
}) {
  const dark = usePrefersColorSchemeDark();
  const theme = dark ? codeThemeDark : codeThemeLight;
  return (
    <Highlight code={code.trim()} language={language} theme={theme}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`${className} relative m-0 px-6 py-5 border-t border-rule-soft bg-paper-3 font-mono text-[0.78rem] leading-[1.55] overflow-x-auto`}
          style={style}
        >
          <span className="absolute top-2 right-5 font-mono text-[0.6rem] tracking-[0.18em] uppercase text-ochre">
            {label}
          </span>
          <code className="block">
            {tokens.map((line, i) => {
              const { key: _lk, className: lc, ...lineRest } = getLineProps({ line });
              return (
                <div key={i} {...lineRest} className={`${lc ?? ""} table-row`}>
                  <span className="table-cell pr-4 select-none text-ink-mute opacity-60 text-right tabular-nums w-[2ch]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="table-cell">
                    {line.map((token, j) => {
                      const { key: _tk, ...tokenRest } = getTokenProps({ token });
                      return <span key={j} {...tokenRest} />;
                    })}
                  </span>
                </div>
              );
            })}
          </code>
        </pre>
      )}
    </Highlight>
  );
}
