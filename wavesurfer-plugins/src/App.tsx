import { useEffect, useMemo, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap.esm.js'
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js'
import EnvelopePlugin from 'wavesurfer.js/dist/plugins/envelope.esm.js'
import HoverPlugin from 'wavesurfer.js/dist/plugins/hover.esm.js'
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.esm.js'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router'
import './App.css'

const AUDIO_URL = '/678785d0-0ead-4906-8f60-f68f22956a80.wav'

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function PluginCard({
  title,
  description,
  code,
  children,
}: {
  title: string
  description: string
  code: string
  children: React.ReactNode
}) {
  return (
    <article className="plugin-card">
      <header className="plugin-card-head">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="plugin-demo">{children}</div>
      <pre className="plugin-code">
        <code>{code}</code>
      </pre>
    </article>
  )
}

function AudioControls({ wsRef }: { wsRef: React.RefObject<WaveSurfer | null> }) {
  const onPlayPause = () => wsRef.current?.playPause()
  const onSkip = (seconds: number) => wsRef.current?.skip(seconds)

  return (
    <div className="audio-controls">
      <button type="button" onClick={onPlayPause}>
        Play / Pause
      </button>
      <button type="button" onClick={() => onSkip(-5)}>
        Back 5s
      </button>
      <button type="button" onClick={() => onSkip(5)}>
        Forward 5s
      </button>
    </div>
  )
}

function RegionsDemo() {
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const [loopEnabled, setLoopEnabled] = useState(true)

  useEffect(() => {
    if (!waveformRef.current) return
    const regions = RegionsPlugin.create()
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      url: AUDIO_URL,
      waveColor: '#8b5cf6',
      progressColor: '#4c1d95',
      plugins: [regions],
    })
    wsRef.current = ws

    const randomColor = () =>
      `hsla(${Math.floor(Math.random() * 360)}, 80%, 60%, 0.35)`

    let activeRegion: ReturnType<typeof regions.addRegion> | null = null

    ws.once('ready', () => {
      regions.addRegion({
        start: 1,
        end: 6,
        content: 'Resize me',
        color: randomColor(),
      })
      regions.addRegion({
        start: 7,
        end: 10,
        content: 'Drag me',
        color: randomColor(),
        resize: false,
      })
      regions.addRegion({
        start: 13,
        content: 'Marker',
        color: randomColor(),
      })
      regions.enableDragSelection({ color: 'rgba(34,197,94,0.15)' })
    })

    regions.on('region-clicked', (region, event) => {
      event.stopPropagation()
      activeRegion = region
      region.play(true)
    })

    regions.on('region-out', (region) => {
      if (loopEnabled && activeRegion === region) {
        region.play()
      }
    })

    return () => {
      wsRef.current = null
      ws.destroy()
    }
  }, [loopEnabled])

  return (
    <div>
      <AudioControls wsRef={wsRef} />
      <div ref={waveformRef} className="wave-container" />
      <label className="control-inline">
        <input
          type="checkbox"
          checked={loopEnabled}
          onChange={(event) => setLoopEnabled(event.target.checked)}
        />
        Loop clicked region
      </label>
    </div>
  )
}

function TimelineDemo() {
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const wsRef = useRef<WaveSurfer | null>(null)

  useEffect(() => {
    if (!waveformRef.current || !timelineRef.current) return

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      url: AUDIO_URL,
      waveColor: '#0ea5e9',
      progressColor: '#0369a1',
      plugins: [TimelinePlugin.create({ container: timelineRef.current })],
    })
    wsRef.current = ws

    return () => {
      wsRef.current = null
      ws.destroy()
    }
  }, [])

  return (
    <div>
      <AudioControls wsRef={wsRef} />
      <div ref={waveformRef} className="wave-container" />
      <div ref={timelineRef} className="timeline-container" />
    </div>
  )
}

function MinimapDemo() {
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const wsRef = useRef<WaveSurfer | null>(null)

  useEffect(() => {
    if (!waveformRef.current) return
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      url: AUDIO_URL,
      waveColor: '#a78bfa',
      progressColor: '#6d28d9',
      minPxPerSec: 120,
      hideScrollbar: true,
      plugins: [
        MinimapPlugin.create({
          height: 28,
          waveColor: '#c4b5fd',
          progressColor: '#7c3aed',
        }),
      ],
    })
    wsRef.current = ws
    return () => {
      wsRef.current = null
      ws.destroy()
    }
  }, [])

  return (
    <div>
      <AudioControls wsRef={wsRef} />
      <div ref={waveformRef} className="wave-container" />
    </div>
  )
}

function SpectrogramDemo() {
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const [spectrogramError, setSpectrogramError] = useState<string | null>(null)

  useEffect(() => {
    if (!waveformRef.current) return
    let cancelled = false
    let ws: WaveSurfer | null = null

    import('wavesurfer.js/dist/plugins/spectrogram.esm.js')
      .then((module) => {
        if (cancelled || !waveformRef.current) return
        ws = WaveSurfer.create({
          container: waveformRef.current,
          url: AUDIO_URL,
          waveColor: '#22c55e',
          progressColor: '#166534',
          minPxPerSec: 80,
          plugins: [
            module.default.create({
              labels: true,
              height: 180,
              scale: 'mel',
              fftSamples: 1024,
              frequencyMax: 8000,
              useWebWorker: false,
            }),
          ],
        })
        wsRef.current = ws
      })
      .catch(() => {
        if (!cancelled) {
          setSpectrogramError(
            'Spectrogram plugin failed to load in this runtime. Other demos still work.',
          )
        }
      })

    return () => {
      cancelled = true
      wsRef.current = null
      if (ws) {
        ws.destroy()
        ws = null
      }
    }
  }, [])

  return (
    <div>
      <AudioControls wsRef={wsRef} />
      {spectrogramError && <p className="record-error">{spectrogramError}</p>}
      <div ref={waveformRef} className="wave-container spectrogram-wave" />
    </div>
  )
}

function RecordDemo() {
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState('Idle')
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState('00:00')
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const recordRef = useRef<RecordPlugin | null>(null)
  const recordedUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!waveformRef.current) return
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#f59e0b',
      progressColor: '#b45309',
    })
    const record = ws.registerPlugin(
      RecordPlugin.create({
        renderRecordedAudio: false,
        continuousWaveform: true,
      }),
    )

    recordRef.current = record

    RecordPlugin.getAvailableAudioDevices()
      .then((availableDevices) => {
        setDevices(availableDevices)
        if (availableDevices[0]) {
          setDeviceId(availableDevices[0].deviceId)
        }
      })
      .catch(() => {
        setDevices([])
      })

    record.on('record-progress', (time) => {
      setElapsed(formatClock(time / 1000))
    })

    record.on('record-end', (blob) => {
      const url = URL.createObjectURL(blob)
      recordedUrlRef.current = url
      setRecordedUrl(url)
      setStatus('Recorded')
    })

    return () => {
      if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current)
      ws.destroy()
    }
  }, [])

  const onRecordToggle = async () => {
    if (!recordRef.current) return
    setError(null)
    if (isRecording || isPaused) {
      recordRef.current.stopRecording()
      setIsRecording(false)
      setIsPaused(false)
      setStatus('Stopped')
      return
    }

    try {
      await recordRef.current.startRecording({ deviceId: deviceId || undefined })
      setIsRecording(true)
      setIsPaused(false)
      setStatus('Recording')
      setElapsed('00:00')
    } catch {
      setError('Microphone access failed. Grant permission and try again.')
    }
  }

  const onPauseToggle = () => {
    if (!recordRef.current) return
    if (isPaused) {
      recordRef.current.resumeRecording()
      setIsPaused(false)
      setIsRecording(true)
      setStatus('Recording')
      return
    }
    recordRef.current.pauseRecording()
    setIsPaused(true)
    setIsRecording(false)
    setStatus('Paused')
  }

  return (
    <div>
      <p className="record-hint">
        Requires microphone permission in your browser.
      </p>
      <div className="record-controls">
        <select
          value={deviceId}
          onChange={(event) => setDeviceId(event.target.value)}
          disabled={isRecording || isPaused}
        >
          {devices.length === 0 && <option value="">Default input</option>}
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || device.deviceId}
            </option>
          ))}
        </select>
        <button type="button" onClick={onRecordToggle}>
          {isRecording || isPaused ? 'Stop' : 'Record'}
        </button>
        <button
          type="button"
          onClick={onPauseToggle}
          disabled={!isRecording && !isPaused}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <p className="record-status">
        Status: {status} ({elapsed})
      </p>
      {error && <p className="record-error">{error}</p>}
      <div ref={waveformRef} className="wave-container" />
      {recordedUrl && (
        <div className="recorded-preview">
          <audio controls src={recordedUrl} />
          <a href={recordedUrl} download="wavesurfer-recording.webm">
            Download recording
          </a>
        </div>
      )}
    </div>
  )
}

function EnvelopeDemo() {
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const [volume, setVolume] = useState('0.00')

  useEffect(() => {
    if (!waveformRef.current) return
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      url: AUDIO_URL,
      waveColor: '#f472b6',
      progressColor: '#9d174d',
    })
    wsRef.current = ws
    const envelope = ws.registerPlugin(
      EnvelopePlugin.create({
        volume: 0.9,
        lineColor: 'rgba(236, 72, 153, 0.8)',
        points: [
          { time: 2.5, volume: 0.3 },
          { time: 7.5, volume: 1 },
          { time: 11.5, volume: 0.5 },
        ],
      }),
    )

    const updateVolume = () => {
      setVolume(envelope.getCurrentVolume().toFixed(2))
    }
    envelope.on('volume-change', updateVolume)
    ws.once('ready', updateVolume)

    return () => {
      wsRef.current = null
      ws.destroy()
    }
  }, [])

  return (
    <div>
      <AudioControls wsRef={wsRef} />
      <p className="control-inline">Current envelope volume: {volume}</p>
      <div ref={waveformRef} className="wave-container" />
    </div>
  )
}

function HoverDemo() {
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const wsRef = useRef<WaveSurfer | null>(null)

  useEffect(() => {
    if (!waveformRef.current) return
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      url: AUDIO_URL,
      waveColor: '#fb7185',
      progressColor: '#be123c',
      plugins: [
        HoverPlugin.create({
          lineColor: '#dc2626',
          lineWidth: 2,
          labelBackground: '#0f172a',
          labelColor: '#fff',
          labelSize: '12px',
        }),
      ],
    })
    wsRef.current = ws
    return () => {
      wsRef.current = null
      ws.destroy()
    }
  }, [])

  return (
    <div>
      <AudioControls wsRef={wsRef} />
      <div ref={waveformRef} className="wave-container" />
    </div>
  )
}

function ZoomDemo() {
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const [minPxPerSec, setMinPxPerSec] = useState(100)
  const wsRef = useRef<WaveSurfer | null>(null)

  useEffect(() => {
    if (!waveformRef.current) return
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      url: AUDIO_URL,
      waveColor: '#60a5fa',
      progressColor: '#1d4ed8',
      minPxPerSec: 100,
    })
    ws.registerPlugin(ZoomPlugin.create({ scale: 0.5, maxZoom: 300 }))
    ws.on('zoom', (next) => setMinPxPerSec(Math.round(next)))
    wsRef.current = ws
    return () => {
      wsRef.current = null
      ws.destroy()
    }
  }, [])

  return (
    <div>
      <p className="control-inline">minPxPerSec: {minPxPerSec}</p>
      <AudioControls wsRef={wsRef} />
      <p className="record-hint">Use your mouse wheel over the waveform to zoom.</p>
      <div ref={waveformRef} className="wave-container" />
    </div>
  )
}

type PluginId =
  | 'regions'
  | 'timeline'
  | 'minimap'
  | 'spectrogram'
  | 'record'
  | 'envelope'
  | 'hover'
  | 'zoom'

const PLUGIN_ORDER: PluginId[] = [
  'regions',
  'timeline',
  'minimap',
  'spectrogram',
  'record',
  'envelope',
  'hover',
  'zoom',
]

const pluginMeta: Record<PluginId, { title: string; description: string }> = {
  regions: {
    title: 'Regions',
    description:
      'Create draggable or resizable overlays for loops, labels, and markers.',
  },
  timeline: {
    title: 'Timeline',
    description: 'Display synchronized timestamps and time ticks under the waveform.',
  },
  minimap: {
    title: 'Minimap',
    description: 'Render a compact overview waveform for fast navigation.',
  },
  spectrogram: {
    title: 'Spectrogram',
    description: 'Visualize frequency content with FFT-based spectrogram rendering.',
  },
  record: {
    title: 'Record',
    description: 'Capture microphone audio and render it in real time.',
  },
  envelope: {
    title: 'Envelope',
    description: 'Control volume over time with editable gain points and fades.',
  },
  hover: {
    title: 'Hover',
    description: 'Show a vertical cursor line and precise timestamp while hovering.',
  },
  zoom: {
    title: 'Zoom',
    description: 'Enable interactive zooming for detailed waveform inspection.',
  },
}

function App() {
  const snippets = useMemo(
    () => ({
      regions:
        "import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js'\nconst regions = Regions.create()\nconst ws = WaveSurfer.create({ container: '#wave', url, plugins: [regions] })\nregions.enableDragSelection({ color: 'rgba(34,197,94,0.15)' })",
      timeline:
        "import Timeline from 'wavesurfer.js/dist/plugins/timeline.esm.js'\nWaveSurfer.create({ container: '#wave', url, plugins: [Timeline.create({ container: '#timeline' })] })",
      minimap:
        "import Minimap from 'wavesurfer.js/dist/plugins/minimap.esm.js'\nWaveSurfer.create({ container: '#wave', url, minPxPerSec: 120, plugins: [Minimap.create({ height: 28 })] })",
      spectrogram:
        "import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram.esm.js'\nWaveSurfer.create({ container: '#wave', url, minPxPerSec: 80, plugins: [Spectrogram.create({ labels: true, fftSamples: 1024, scale: 'mel' })] })",
      record:
        "import Record from 'wavesurfer.js/dist/plugins/record.esm.js'\nconst record = ws.registerPlugin(Record.create({ continuousWaveform: true }))\nawait record.startRecording({ deviceId })\nrecord.on('record-end', (blob) => URL.createObjectURL(blob))",
      envelope:
        "import Envelope from 'wavesurfer.js/dist/plugins/envelope.esm.js'\nconst envelope = ws.registerPlugin(Envelope.create({ points: [{ time: 2.5, volume: 0.3 }] }))\nenvelope.on('volume-change', () => envelope.getCurrentVolume())",
      hover:
        "import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js'\nWaveSurfer.create({ container: '#wave', url, plugins: [Hover.create({ lineColor: '#dc2626', labelSize: '12px' })] })",
      zoom:
        "import Zoom from 'wavesurfer.js/dist/plugins/zoom.esm.js'\nconst ws = WaveSurfer.create({ container: '#wave', url, minPxPerSec: 100 })\nws.registerPlugin(Zoom.create({ scale: 0.5, maxZoom: 300 }))\nws.on('zoom', (value) => console.log(value))",
    }),
    [],
  )

  const pluginContent: Record<PluginId, React.ReactNode> = {
    regions: <RegionsDemo />,
    timeline: <TimelineDemo />,
    minimap: <MinimapDemo />,
    spectrogram: <SpectrogramDemo />,
    record: <RecordDemo />,
    envelope: <EnvelopeDemo />,
    hover: <HoverDemo />,
    zoom: <ZoomDemo />,
  }

  const location = useLocation()
  const pathnameId = location.pathname.replace('/', '') as PluginId
  const activePlugin = PLUGIN_ORDER.includes(pathnameId) ? pathnameId : 'regions'
  const activeIndex = PLUGIN_ORDER.indexOf(activePlugin)
  const previousPlugin =
    PLUGIN_ORDER[(activeIndex - 1 + PLUGIN_ORDER.length) % PLUGIN_ORDER.length]
  const nextPlugin = PLUGIN_ORDER[(activeIndex + 1) % PLUGIN_ORDER.length]

  return (
    <main className="showcase">
      <header className="hero">
        <h1>Wavesurfer.js Plugins Showcase</h1>
        <p>One plugin per page for focused review.</p>
      </header>
      <nav className="plugin-nav" aria-label="Plugin pages">
        {PLUGIN_ORDER.map((id) => (
          <NavLink
            key={id}
            to={`/${id}`}
            className={id === activePlugin ? 'is-active' : ''}
          >
            {pluginMeta[id].title}
          </NavLink>
        ))}
      </nav>
      <section className="single-page">
        <Routes>
          {PLUGIN_ORDER.map((id) => (
            <Route
              key={id}
              path={`/${id}`}
              element={
                <PluginCard
                  title={pluginMeta[id].title}
                  description={pluginMeta[id].description}
                  code={snippets[id]}
                >
                  {pluginContent[id]}
                </PluginCard>
              }
            />
          ))}
          <Route path="/" element={<Navigate to="/regions" replace />} />
          <Route path="*" element={<Navigate to="/regions" replace />} />
        </Routes>
      </section>
      <div className="pager">
        <NavLink to={`/${previousPlugin}`}>
          Previous: {pluginMeta[previousPlugin].title}
        </NavLink>
        <NavLink to={`/${nextPlugin}`}>Next: {pluginMeta[nextPlugin].title}</NavLink>
      </div>
      <footer className="footer">
        Audio source: <code>{AUDIO_URL}</code>
      </footer>
    </main>
  )
}

export default App
