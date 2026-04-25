import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { AudioControls } from "../components/AudioControls";
import {
  AUDIO_URL,
  WAVE_COLOR,
  WAVE_CURSOR,
  WAVE_CURSOR_WIDTH,
  WAVE_PROGRESS,
} from "../lib/constants";

export function SpectrogramDemo() {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!waveformRef.current) return;
    let cancelled = false;
    let ws: WaveSurfer | null = null;

    import("wavesurfer.js/dist/plugins/spectrogram.esm.js")
      .then((module) => {
        if (cancelled || !waveformRef.current) return;
        ws = WaveSurfer.create({
          container: waveformRef.current,
          url: AUDIO_URL,
          waveColor: WAVE_COLOR,
          progressColor: WAVE_PROGRESS,
          cursorColor: WAVE_CURSOR,
          cursorWidth: WAVE_CURSOR_WIDTH,
          minPxPerSec: 80,
          plugins: [
            module.default.create({
              labels: true,
              height: 180,
              scale: "mel",
              fftSamples: 1024,
              frequencyMax: 8000,
              useWebWorker: false,
            }),
          ],
        });
        wsRef.current = ws;
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Spectrogram plugin failed to load in this runtime. Other demos still work.",
          );
        }
      });

    return () => {
      cancelled = true;
      wsRef.current = null;
      if (ws) {
        ws.destroy();
        ws = null;
      }
    };
  }, []);

  return (
    <div>
      <AudioControls wsRef={wsRef} />
      {error && (
        <p className="m-0 mb-2 font-mono text-[0.85rem] text-blood border-l-2 border-blood pl-3">
          {error}
        </p>
      )}
      <div
        ref={waveformRef}
        className="paper-hatched border border-rule rounded-paper min-h-[360px]"
      />
    </div>
  );
}
