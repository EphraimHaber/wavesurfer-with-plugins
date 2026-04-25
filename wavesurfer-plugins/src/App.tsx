import { Navigate, Route, Routes, useLocation } from "react-router";
import { motion } from "motion/react";
import { Hero } from "./components/Hero";
import { PluginNav } from "./components/PluginNav";
import { Pager } from "./components/Pager";
import { Footer } from "./components/Footer";
import { PluginCard } from "./components/PluginCard";
import {
  PLUGIN_ORDER,
  pluginMeta,
  snippets,
  type PluginId,
} from "./components/pluginMeta";
import { RegionsDemo } from "./demos/RegionsDemo";
import { TimelineDemo } from "./demos/TimelineDemo";
import { MinimapDemo } from "./demos/MinimapDemo";
import { SpectrogramDemo } from "./demos/SpectrogramDemo";
import { RecordDemo } from "./demos/RecordDemo";
import { EnvelopeDemo } from "./demos/EnvelopeDemo";
import { HoverDemo } from "./demos/HoverDemo";
import { ZoomDemo } from "./demos/ZoomDemo";
import { ElanDemo } from "./demos/elan/ElanDemo";
import "./App.css";

const pluginContent: Record<PluginId, React.ReactNode> = {
  regions: <RegionsDemo />,
  timeline: <TimelineDemo />,
  minimap: <MinimapDemo />,
  spectrogram: <SpectrogramDemo />,
  record: <RecordDemo />,
  envelope: <EnvelopeDemo />,
  hover: <HoverDemo />,
  zoom: <ZoomDemo />,
  elan: <ElanDemo />,
};

const RAIL = "px-4 sm:px-6 lg:px-10";
const COLUMN = "max-w-[1280px] mx-auto";

function App() {
  const location = useLocation();
  const pathnameId = location.pathname.replace("/", "") as PluginId;
  const activePlugin = PLUGIN_ORDER.includes(pathnameId)
    ? pathnameId
    : "regions";

  return (
    <main className="w-full pt-10 pb-16">
      <div className={`${COLUMN} ${RAIL}`}>
        <Hero />
        <PluginNav activePlugin={activePlugin} />
      </div>

      {/* Full-width view section */}
      <section className={RAIL}>
        <motion.div
          key={activePlugin}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Routes>
            {PLUGIN_ORDER.map((id, i) => (
              <Route
                key={id}
                path={`/${id}`}
                element={
                  <PluginCard
                    title={pluginMeta[id].title}
                    description={pluginMeta[id].description}
                    code={snippets[id]}
                    folio={String(i + 1).padStart(2, "0")}
                  >
                    {pluginContent[id]}
                  </PluginCard>
                }
              />
            ))}
            <Route path="/" element={<Navigate to="/regions" replace />} />
            <Route path="*" element={<Navigate to="/regions" replace />} />
          </Routes>
        </motion.div>
      </section>

      <div className={`${COLUMN} ${RAIL}`}>
        <Pager activePlugin={activePlugin} />
        <Footer />
      </div>
    </main>
  );
}

export default App;
