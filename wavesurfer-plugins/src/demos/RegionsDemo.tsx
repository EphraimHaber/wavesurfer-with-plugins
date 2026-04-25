import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import { AudioControls } from "../components/AudioControls";
import {
  AUDIO_URL,
  WAVE_COLOR,
  WAVE_CURSOR,
  WAVE_CURSOR_WIDTH,
  WAVE_PROGRESS,
} from "../lib/constants";
import { colorForIndex } from "../lib/format";

export function RegionsDemo() {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [loopEnabled, setLoopEnabled] = useState(true);

  useEffect(() => {
    if (!waveformRef.current) return;
    const regions = RegionsPlugin.create();
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      url: AUDIO_URL,
      waveColor: WAVE_COLOR,
      progressColor: WAVE_PROGRESS,
      cursorColor: WAVE_CURSOR,
      cursorWidth: WAVE_CURSOR_WIDTH,
      plugins: [regions],
    });
    wsRef.current = ws;

    let activeRegion: ReturnType<typeof regions.addRegion> | null = null;

    ws.once("ready", () => {
      regions.addRegion({
        start: 1,
        end: 6,
        content: "Resize me",
        color: colorForIndex(0),
      });
      regions.addRegion({
        start: 7,
        end: 10,
        content: "Drag me",
        color: colorForIndex(1),
        resize: false,
      });
      regions.addRegion({
        start: 13,
        content: "Marker",
        color: colorForIndex(2),
      });
      regions.enableDragSelection({ color: "rgba(178,90,31,0.15)" });
    });

    regions.on("region-clicked", (region, event) => {
      event.stopPropagation();
      activeRegion = region;
      region.play(true);
    });

    regions.on("region-out", (region) => {
      if (loopEnabled && activeRegion === region) region.play();
    });

    return () => {
      wsRef.current = null;
      ws.destroy();
    };
  }, [loopEnabled]);

  return (
    <div>
      <AudioControls wsRef={wsRef} />
      <div
        ref={waveformRef}
        className="paper-hatched border border-rule rounded-paper min-h-[280px]"
      />
      <label className="inline-flex items-center gap-2 mt-3 font-mono text-[0.78rem] tracking-[0.04em] text-ink-soft">
        <input
          type="checkbox"
          checked={loopEnabled}
          onChange={(e) => setLoopEnabled(e.target.checked)}
          className="accent-ochre"
        />
        Loop clicked region
      </label>
    </div>
  );
}
