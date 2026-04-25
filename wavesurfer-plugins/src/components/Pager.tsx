import { NavLink } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PLUGIN_ORDER, pluginMeta, type PluginId } from "./pluginMeta";

export function Pager({ activePlugin }: { activePlugin: PluginId }) {
  const idx = PLUGIN_ORDER.indexOf(activePlugin);
  const prev =
    PLUGIN_ORDER[(idx - 1 + PLUGIN_ORDER.length) % PLUGIN_ORDER.length];
  const next = PLUGIN_ORDER[(idx + 1) % PLUGIN_ORDER.length];
  const linkClass =
    "flex-1 inline-flex items-center gap-3 px-4 py-3 bg-paper-2 border border-rule rounded-paper font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink no-underline transition hover:bg-ink hover:text-cream hover:-translate-y-px";
  return (
    <div className="mt-6 flex justify-between gap-3">
      <NavLink to={`/${prev}`} className={`${linkClass} justify-start`}>
        <ArrowLeft size={16} strokeWidth={1.75} />
        <span className="flex flex-col items-start leading-tight">
          <span className="text-ink-mute text-[0.62rem]">previous</span>
          <span
            className="font-display italic text-[1rem] tracking-normal normal-case"
            style={{ fontVariationSettings: '"opsz" 14, "SOFT" 80' }}
          >
            {pluginMeta[prev].title}
          </span>
        </span>
      </NavLink>
      <NavLink to={`/${next}`} className={`${linkClass} justify-end`}>
        <span className="flex flex-col items-end leading-tight">
          <span className="text-ink-mute text-[0.62rem]">next</span>
          <span
            className="font-display italic text-[1rem] tracking-normal normal-case"
            style={{ fontVariationSettings: '"opsz" 14, "SOFT" 80' }}
          >
            {pluginMeta[next].title}
          </span>
        </span>
        <ArrowRight size={16} strokeWidth={1.75} />
      </NavLink>
    </div>
  );
}
