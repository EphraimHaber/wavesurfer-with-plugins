import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.esm.js";
import { Mic, Pause, Play, Square, Download } from "lucide-react";
import { CtrlBtn } from "../components/AudioControls";
import {
  WAVE_COLOR,
  WAVE_CURSOR,
  WAVE_CURSOR_WIDTH,
  WAVE_PROGRESS,
} from "../lib/constants";
import { formatClock } from "../lib/format";

export function RecordDemo() {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState("00:00");
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const recordRef = useRef<RecordPlugin | null>(null);
  const recordedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!waveformRef.current) return;
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: WAVE_COLOR,
      progressColor: WAVE_PROGRESS,
      cursorColor: WAVE_CURSOR,
      cursorWidth: WAVE_CURSOR_WIDTH,
    });
    const record = ws.registerPlugin(
      RecordPlugin.create({
        renderRecordedAudio: false,
        continuousWaveform: true,
      }),
    );
    recordRef.current = record;

    RecordPlugin.getAvailableAudioDevices()
      .then((availableDevices) => {
        setDevices(availableDevices);
        if (availableDevices[0]) setDeviceId(availableDevices[0].deviceId);
      })
      .catch(() => setDevices([]));

    record.on("record-progress", (time) => setElapsed(formatClock(time / 1000)));

    record.on("record-end", (blob) => {
      const url = URL.createObjectURL(blob);
      recordedUrlRef.current = url;
      setRecordedUrl(url);
      setStatus("Recorded");
    });

    return () => {
      if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
      ws.destroy();
    };
  }, []);

  const onRecordToggle = async () => {
    if (!recordRef.current) return;
    setError(null);
    if (isRecording || isPaused) {
      recordRef.current.stopRecording();
      setIsRecording(false);
      setIsPaused(false);
      setStatus("Stopped");
      return;
    }
    try {
      await recordRef.current.startRecording({
        deviceId: deviceId || undefined,
      });
      setIsRecording(true);
      setIsPaused(false);
      setStatus("Recording");
      setElapsed("00:00");
    } catch {
      setError("Microphone access failed. Grant permission and try again.");
    }
  };

  const onPauseToggle = () => {
    if (!recordRef.current) return;
    if (isPaused) {
      recordRef.current.resumeRecording();
      setIsPaused(false);
      setIsRecording(true);
      setStatus("Recording");
      return;
    }
    recordRef.current.pauseRecording();
    setIsPaused(true);
    setIsRecording(false);
    setStatus("Paused");
  };

  const recording = isRecording || isPaused;

  return (
    <div>
      <p
        className="m-0 mb-3 font-display italic text-[0.95rem] text-ink-soft border-l-2 border-ochre pl-3 max-w-[60ch]"
        style={{ fontVariationSettings: '"opsz" 14, "SOFT" 50' }}
      >
        Requires microphone permission in your browser.
      </p>

      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          disabled={recording}
          className="px-3 py-2 rounded-paper bg-cream text-ink border border-ink font-mono text-[0.78rem] disabled:opacity-40"
        >
          {devices.length === 0 && <option value="">Default input</option>}
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || device.deviceId}
            </option>
          ))}
        </select>

        <CtrlBtn
          onClick={onRecordToggle}
          icon={
            recording ? (
              <Square size={14} strokeWidth={1.75} fill="currentColor" />
            ) : (
              <Mic size={14} strokeWidth={1.75} />
            )
          }
          variant={recording ? "danger" : "primary"}
        >
          {recording ? "Stop" : "Record"}
        </CtrlBtn>

        <CtrlBtn
          onClick={onPauseToggle}
          disabled={!recording}
          icon={
            isPaused ? (
              <Play size={14} strokeWidth={1.75} />
            ) : (
              <Pause size={14} strokeWidth={1.75} />
            )
          }
        >
          {isPaused ? "Resume" : "Pause"}
        </CtrlBtn>
      </div>

      <p className="m-0 mb-3 font-mono text-[0.78rem] tracking-[0.04em] text-ink-soft">
        Status{" "}
        <span className="text-ink">{status}</span>{" "}
        <span className="text-ochre tabular-nums">({elapsed})</span>
      </p>

      {error && (
        <p className="m-0 mb-3 font-mono text-[0.85rem] text-blood border-l-2 border-blood pl-3">
          {error}
        </p>
      )}

      <div
        ref={waveformRef}
        className="paper-hatched border border-rule rounded-paper min-h-[280px]"
      />

      {recordedUrl && (
        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <audio controls src={recordedUrl} className="max-w-full" />
          <a
            href={recordedUrl}
            download="wavesurfer-recording.webm"
            className="inline-flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-ink no-underline border-b border-ochre pb-0.5 hover:text-ochre"
          >
            <Download size={14} strokeWidth={1.75} />
            Download recording
          </a>
        </div>
      )}
    </div>
  );
}
