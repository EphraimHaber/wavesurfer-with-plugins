import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";
import { AudioControls } from "../components/AudioControls";
import {
  AUDIO_URL,
  WAVE_COLOR,
  WAVE_CURSOR,
  WAVE_CURSOR_WIDTH,
  WAVE_PROGRESS,
} from "../lib/constants";

export function TimelineDemo() {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!waveformRef.current || !timelineRef.current) return;
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      url: AUDIO_URL,
      waveColor: WAVE_COLOR,
      progressColor: WAVE_PROGRESS,
      cursorColor: WAVE_CURSOR,
      cursorWidth: WAVE_CURSOR_WIDTH,
      plugins: [TimelinePlugin.create({ container: timelineRef.current })],
    });
    wsRef.current = ws;
    return () => {
      wsRef.current = null;
      ws.destroy();
    };
  }, []);

  return (
    <div>
      <AudioControls wsRef={wsRef} />
      <div
        ref={waveformRef}
        className="paper-hatched border border-rule rounded-paper min-h-[280px]"
      />
      <div ref={timelineRef} className="mt-2" />
    </div>
  );
}
