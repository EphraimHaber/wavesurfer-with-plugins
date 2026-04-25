import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import EnvelopePlugin from "wavesurfer.js/dist/plugins/envelope.esm.js";
import { AudioControls } from "../components/AudioControls";
import {
  AUDIO_URL,
  WAVE_COLOR,
  WAVE_CURSOR,
  WAVE_CURSOR_WIDTH,
  WAVE_PROGRESS,
} from "../lib/constants";

export function EnvelopeDemo() {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [volume, setVolume] = useState("0.00");

  useEffect(() => {
    if (!waveformRef.current) return;
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      url: AUDIO_URL,
      waveColor: WAVE_COLOR,
      progressColor: WAVE_PROGRESS,
      cursorColor: WAVE_CURSOR,
      cursorWidth: WAVE_CURSOR_WIDTH,
    });
    wsRef.current = ws;
    const envelope = ws.registerPlugin(
      EnvelopePlugin.create({
        volume: 0.9,
        lineColor: "rgba(178,90,31,0.85)",
        points: [
          { time: 2.5, volume: 0.3 },
          { time: 7.5, volume: 1 },
          { time: 11.5, volume: 0.5 },
        ],
      }),
    );

    const updateVolume = () =>
      setVolume(envelope.getCurrentVolume().toFixed(2));
    envelope.on("volume-change", updateVolume);
    ws.once("ready", updateVolume);

    return () => {
      wsRef.current = null;
      ws.destroy();
    };
  }, []);

  return (
    <div>
      <AudioControls wsRef={wsRef} />
      <p className="m-0 mb-3 font-mono text-[0.78rem] tracking-[0.04em] text-ink-soft">
        Current envelope volume{" "}
        <span className="text-ochre tabular-nums">{volume}</span>
      </p>
      <div
        ref={waveformRef}
        className="paper-hatched border border-rule rounded-paper min-h-[280px]"
      />
    </div>
  );
}
