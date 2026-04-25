import {
  Activity,
  Languages,
  Layers,
  Map,
  Mic,
  MousePointer2,
  Ruler,
  SlidersHorizontal,
  ZoomIn,
  type LucideIcon,
} from "lucide-react";

export type PluginId =
  | "regions"
  | "timeline"
  | "minimap"
  | "spectrogram"
  | "record"
  | "envelope"
  | "hover"
  | "zoom"
  | "elan";

export const PLUGIN_ORDER: PluginId[] = [
  "regions",
  "timeline",
  "minimap",
  "spectrogram",
  "record",
  "envelope",
  "hover",
  "zoom",
  "elan",
];

export const pluginMeta: Record<
  PluginId,
  { title: string; description: string; icon: LucideIcon }
> = {
  regions: {
    title: "Regions",
    description:
      "Create draggable or resizable overlays for loops, labels, and markers.",
    icon: Layers,
  },
  timeline: {
    title: "Timeline",
    description:
      "Display synchronized timestamps and time ticks under the waveform.",
    icon: Ruler,
  },
  minimap: {
    title: "Minimap",
    description: "Render a compact overview waveform for fast navigation.",
    icon: Map,
  },
  spectrogram: {
    title: "Spectrogram",
    description:
      "Visualize frequency content with FFT-based spectrogram rendering.",
    icon: Activity,
  },
  record: {
    title: "Record",
    description: "Capture microphone audio and render it in real time.",
    icon: Mic,
  },
  envelope: {
    title: "Envelope",
    description:
      "Control volume over time with editable gain points and fades.",
    icon: SlidersHorizontal,
  },
  hover: {
    title: "Hover",
    description:
      "Show a vertical cursor line and precise timestamp while hovering.",
    icon: MousePointer2,
  },
  zoom: {
    title: "Zoom",
    description: "Enable interactive zooming for detailed waveform inspection.",
    icon: ZoomIn,
  },
  elan: {
    title: "ELAN",
    description:
      "Headless ELAN editor: lanes & table views, full CRUD on annotations, drag/resize regions write back to TIME_SLOTs, live EAF XML inspector.",
    icon: Languages,
  },
};

export const snippets: Record<PluginId, string> = {
  regions: `import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js'

const regions = Regions.create()
const ws = WaveSurfer.create({
  container: '#wave',
  url,
  plugins: [regions],
})
regions.enableDragSelection({ color: 'rgba(178,90,31,0.15)' })`,
  timeline: `import Timeline from 'wavesurfer.js/dist/plugins/timeline.esm.js'

WaveSurfer.create({
  container: '#wave',
  url,
  plugins: [Timeline.create({ container: '#timeline' })],
})`,
  minimap: `import Minimap from 'wavesurfer.js/dist/plugins/minimap.esm.js'

WaveSurfer.create({
  container: '#wave',
  url,
  minPxPerSec: 120,
  plugins: [Minimap.create({ height: 28 })],
})`,
  spectrogram: `import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram.esm.js'

WaveSurfer.create({
  container: '#wave',
  url,
  minPxPerSec: 80,
  plugins: [
    Spectrogram.create({
      labels: true,
      fftSamples: 1024,
      scale: 'mel',
    }),
  ],
})`,
  record: `import Record from 'wavesurfer.js/dist/plugins/record.esm.js'

const record = ws.registerPlugin(
  Record.create({ continuousWaveform: true })
)
await record.startRecording({ deviceId })
record.on('record-end', (blob) => URL.createObjectURL(blob))`,
  envelope: `import Envelope from 'wavesurfer.js/dist/plugins/envelope.esm.js'

const envelope = ws.registerPlugin(
  Envelope.create({
    points: [{ time: 2.5, volume: 0.3 }],
  })
)
envelope.on('volume-change', () => envelope.getCurrentVolume())`,
  hover: `import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js'

WaveSurfer.create({
  container: '#wave',
  url,
  plugins: [Hover.create({ lineColor: '#b25a1f', labelSize: '12px' })],
})`,
  zoom: `import Zoom from 'wavesurfer.js/dist/plugins/zoom.esm.js'

const ws = WaveSurfer.create({
  container: '#wave',
  url,
  minPxPerSec: 100,
})
ws.registerPlugin(Zoom.create({ scale: 0.5, maxZoom: 300 }))
ws.on('zoom', (value) => console.log(value))`,
  elan: `import ElanPlugin from './plugins/elan'

// CRUD
elan.createAlignableAnnotation(tier, start, end, value)
elan.createRefAnnotation(tier, refId, value)
elan.deleteAnnotation(id)
elan.updateAnnotationText(id, value)

// Headless views — subscribe and render lanes or table
elan.on('tableViewChange', (model) => render(model))
elan.on('select', (start) => ws.setTime(start))`,
};
