import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import ZoomPlugin from "wavesurfer.js/dist/plugins/zoom.esm.js";
import { AudioControls } from "../components/AudioControls";
import {
  AUDIO_URL,
  WAVE_COLOR,
  WAVE_CURSOR,
  WAVE_CURSOR_WIDTH,
  WAVE_PROGRESS,
} from "../lib/constants";

export function ZoomDemo() {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [minPxPerSec, setMinPxPerSec] = useState(100);

  useEffect(() => {
    if (!waveformRef.current) return;
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      url: AUDIO_URL,
      waveColor: WAVE_COLOR,
      progressColor: WAVE_PROGRESS,
      cursorColor: WAVE_CURSOR,
      cursorWidth: WAVE_CURSOR_WIDTH,
      minPxPerSec: 100,
    });
    ws.registerPlugin(ZoomPlugin.create({ scale: 0.5, maxZoom: 300 }));
    ws.on("zoom", (next) => setMinPxPerSec(Math.round(next)));
    wsRef.current = ws;
    return () => {
      wsRef.current = null;
      ws.destroy();
    };
  }, []);

  return (
    <div>
      <p className="m-0 mb-2 font-mono text-[0.78rem] tracking-[0.04em] text-ink-soft">
        minPxPerSec{" "}
        <span className="text-ochre tabular-nums">{minPxPerSec}</span>
      </p>
      <AudioControls wsRef={wsRef} />
      <p
        className="m-0 mb-3 font-display italic text-[0.95rem] text-ink-soft border-l-2 border-ochre pl-3 max-w-[60ch]"
        style={{ fontVariationSettings: '"opsz" 14, "SOFT" 50' }}
      >
        Use your mouse wheel over the waveform to zoom.
      </p>
      <div
        ref={waveformRef}
        className="paper-hatched border border-rule rounded-paper min-h-[280px]"
      />
    </div>
  );
}
