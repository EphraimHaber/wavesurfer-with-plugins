import type WaveSurfer from "wavesurfer.js";
import { ZoomIn, ZoomOut } from "lucide-react";
import { AudioControls } from "../../components/AudioControls";

interface Props {
  waveformRef: React.RefObject<HTMLDivElement | null>;
  wsRef: React.RefObject<WaveSurfer | null>;
  loopEnabled: boolean;
  onLoopToggle: (enabled: boolean) => void;
  zoom: number;
  onZoomChange: (next: number) => void;
  zoomMin: number;
  zoomMax: number;
}

export function ElanWaveform({
  waveformRef,
  wsRef,
  loopEnabled,
  onLoopToggle,
  zoom,
  onZoomChange,
  zoomMin,
  zoomMax,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <AudioControls wsRef={wsRef} />
        <span className="flex-1" />
        <div className="inline-flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.08em] text-ink-soft mb-3">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => onZoomChange(zoom - 50)}
            className="inline-flex items-center justify-center w-6 h-6 rounded-paper border border-rule hover:border-ochre hover:text-ochre transition"
          >
            <ZoomOut size={13} strokeWidth={1.75} />
          </button>
          <input
            type="range"
            min={zoomMin}
            max={zoomMax}
            step={5}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            aria-label="Zoom level"
            className="accent-ochre w-32 cursor-ew-resize"
          />
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => onZoomChange(zoom + 50)}
            className="inline-flex items-center justify-center w-6 h-6 rounded-paper border border-rule hover:border-ochre hover:text-ochre transition"
          >
            <ZoomIn size={13} strokeWidth={1.75} />
          </button>
          <span className="tabular-nums text-ochre w-10 text-right">
            {zoom}
          </span>
        </div>
        <label className="inline-flex items-center gap-1.5 font-mono text-[0.66rem] uppercase tracking-[0.08em] text-ink-soft cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={loopEnabled}
            onChange={(e) => onLoopToggle(e.target.checked)}
            className="accent-ochre"
          />
          Loop selected
        </label>
      </div>
      <div
        ref={waveformRef}
        className="paper-hatched border-y border-rule-soft min-h-[260px] overflow-x-auto"
      />
    </div>
  );
}
