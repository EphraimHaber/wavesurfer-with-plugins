import { NavLink } from "react-router";
import { motion } from "motion/react";
import { PLUGIN_ORDER, pluginMeta, type PluginId } from "./pluginMeta";

export function PluginNav({ activePlugin }: { activePlugin: PluginId }) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      aria-label="Plugin pages"
      className="flex flex-wrap mb-7 border border-rule rounded-paper bg-paper-2 overflow-hidden shadow-paper"
    >
      {PLUGIN_ORDER.map((id) => {
        const Icon = pluginMeta[id].icon;
        const isActive = id === activePlugin;
        return (
          <NavLink
            key={id}
            to={`/${id}`}
            className={[
              "relative flex-1 inline-flex items-center justify-center gap-2",
              "px-3 py-2.5 border-r border-rule-soft last:border-r-0",
              "font-mono text-[0.7rem] uppercase font-medium tracking-[0.1em] no-underline",
              "transition-colors duration-150",
              isActive
                ? "bg-ink text-cream"
                : "text-ink-soft hover:text-ochre",
            ].join(" ")}
          >
            <Icon size={14} strokeWidth={1.75} />
            <span>{pluginMeta[id].title}</span>
          </NavLink>
        );
      })}
    </motion.nav>
  );
}
