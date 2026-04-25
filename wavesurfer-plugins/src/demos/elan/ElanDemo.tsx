import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import {
  FileCode2,
  Plus,
  Trash2,
  CornerDownLeft,
} from "lucide-react";
import ElanPlugin, {
  type ElanParsedData,
  type ElanTableViewModel,
} from "../../plugins/elan";
import { AudioControls } from "../../components/AudioControls";
import {
  AUDIO_URL,
  ELAN_URL,
  WAVE_COLOR,
  WAVE_CURSOR,
  WAVE_CURSOR_WIDTH,
  WAVE_PROGRESS,
} from "../../lib/constants";
import { colorForIndex, formatElanTimestamp } from "../../lib/format";
import { XmlModal } from "./XmlModal";

export function ElanDemo() {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const elanPluginRef = useRef<InstanceType<typeof ElanPlugin> | null>(null);
  const regionsPluginRef = useRef<InstanceType<typeof RegionsPlugin> | null>(null);
  const eafIdsRef = useRef<Set<string>>(new Set());
  const createTierRef = useRef<string>("");
  const loopEnabledRef = useRef(true);

  const [elanTable, setElanTable] = useState<ElanTableViewModel | null>(null);
  const [elanData, setElanData] = useState<ElanParsedData | null>(null);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [workflowMode, setWorkflowMode] = useState<"compose" | "review">(
    "compose",
  );
  const [duration, setDuration] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [xmlOpen, setXmlOpen] = useState(false);
  const [xmlContent, setXmlContent] = useState<string | null>(null);
  const [draftById, setDraftById] = useState<Record<string, string>>({});
  const [segmentQuery, setSegmentQuery] = useState("");
  const [showOnlyNeedsText, setShowOnlyNeedsText] = useState(false);
  const [writerOpen, setWriterOpen] = useState(false);
  const startInputRef = useRef<HTMLInputElement | null>(null);
  const endInputRef = useRef<HTMLInputElement | null>(null);

  // Keep loop state current for region callbacks without re-creating WaveSurfer.
  useEffect(() => {
    loopEnabledRef.current = loopEnabled;
  }, [loopEnabled]);

  const colorForAlignableOrder = useCallback(
    (annotationId: string, fallbackIndex = 0) => {
      const idx =
        elanPluginRef.current
          ?.getData()
          ?.alignableAnnotations.findIndex((ann) => ann.id === annotationId) ??
        -1;
      return colorForIndex(idx >= 0 ? idx : fallbackIndex);
    },
    [],
  );

  useEffect(() => {
    if (!waveformRef.current) return;

    const elan = ElanPlugin.create({ url: ELAN_URL });
    const regions = RegionsPlugin.create();
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      url: AUDIO_URL,
      waveColor: WAVE_COLOR,
      progressColor: WAVE_PROGRESS,
      cursorColor: WAVE_CURSOR,
      cursorWidth: WAVE_CURSOR_WIDTH,
      plugins: [regions, elan],
    });
    wsRef.current = ws;
    elanPluginRef.current = elan;
    regionsPluginRef.current = regions;

    let activeRegion: ReturnType<typeof regions.addRegion> | null = null;
    let audioReady = false;
    let parsedElan: ElanParsedData | null = null;
    let elanRegionsApplied = false;
    const eafIds = eafIdsRef.current;

    const applyElanRegions = () => {
      if (elanRegionsApplied || !audioReady || !parsedElan) return;
      regions.clearRegions();
      eafIds.clear();
      parsedElan.alignableAnnotations.forEach((ann, i) => {
        if (ann.start == null) return;
        const end = ann.end ?? ann.start;
        const isMarker = end <= ann.start;
        eafIds.add(ann.id);
        regions.addRegion({
          id: ann.id,
          start: ann.start,
          ...(isMarker ? {} : { end }),
          content: ann.id,
          color: colorForAlignableOrder(ann.id, i),
          drag: true,
          resize: !isMarker,
          contentEditable: false,
        });
      });
      regions.enableDragSelection({ color: "rgba(178, 90, 31, 0.18)" });
      elanRegionsApplied = true;
    };

    ws.once("ready", () => {
      audioReady = true;
      setDuration(ws.getDuration());
      applyElanRegions();
    });

    elan.once("ready", (data) => {
      parsedElan = data;
      setElanData(data);
      createTierRef.current = data.tiers[0]?.id ?? "";
      applyElanRegions();
    });

    // Drag-selecting on the wave creates a new alignable in the active tier.
    const unsubRegionCreated = regions.on("region-created", (region) => {
      if (eafIds.has(region.id)) return;
      const tierId = createTierRef.current;
      const start = region.start;
      const end = region.end ?? start;
      if (!tierId || !elanPluginRef.current) {
        region.remove();
        return;
      }
      const newId = elanPluginRef.current.createAlignableAnnotation(
        tierId,
        start,
        end,
        "",
      );
      if (!newId) {
        region.remove();
        return;
      }
      // Replace the auto-id region with the EAF-backed one.
      region.remove();
      eafIds.add(newId);
      regions.addRegion({
        id: newId,
        start,
        end,
        content: newId,
        color: colorForAlignableOrder(newId, eafIds.size),
        drag: true,
        resize: true,
        contentEditable: false,
      });
      setSelectedId(newId);
    });

    const unsubRegionClick = regions.on("region-clicked", (region, event) => {
      event.stopPropagation();
      activeRegion = region;
      setSelectedId(region.id);
      region.play(true);
    });
    const unsubRegionOut = regions.on("region-out", (region) => {
      if (loopEnabledRef.current && activeRegion === region) region.play();
    });
    const unsubRegionUpdated = regions.on("region-updated", (region) => {
      elan.syncAlignableTimes(region.id, region.start, region.end ?? region.start);
    });
    const unsubRegionContent = regions.on("region-content-changed", (region) => {
      const raw = region.getContent();
      const text =
        typeof raw === "string"
          ? raw.replace(/<[^>]*>/g, "").trim()
          : ((raw as HTMLElement | undefined)?.textContent ?? "").trim();
      elan.syncAlignableText(region.id, text);
    });
    const unsubTable = elan.on("tableViewChange", (model) => setElanTable(model));
    const unsubSelect = elan.on("select", (start) => ws.setTime(start));
    const unsubEafUpdated = elan.on("eafUpdated", () => {
      setElanData(elan.getData());
      setXmlContent((cur) => (cur != null ? elan.getEafXml() ?? null : cur));
    });

    return () => {
      unsubRegionCreated();
      unsubRegionClick();
      unsubRegionOut();
      unsubRegionUpdated();
      unsubRegionContent();
      unsubTable();
      unsubSelect();
      unsubEafUpdated();
      setElanTable(null);
      setElanData(null);
      setSelectedId(null);
      eafIds.clear();
      regionsPluginRef.current = null;
      elanPluginRef.current = null;
      wsRef.current = null;
      ws.destroy();
    };
  }, [colorForAlignableOrder]);

  const onCreateAlignable = useCallback(() => {
    const ws = wsRef.current;
    const elan = elanPluginRef.current;
    const regions = regionsPluginRef.current;
    const tierId = createTierRef.current;
    if (!ws || !elan || !regions || !tierId) return;
    const start = ws.getCurrentTime();
    const end = Math.min(start + 1.5, ws.getDuration());
    const id = elan.createAlignableAnnotation(tierId, start, end, "");
    if (!id) return;
    eafIdsRef.current.add(id);
    regions.addRegion({
      id,
      start,
      end,
      content: id,
      color: colorForAlignableOrder(id, eafIdsRef.current.size),
      drag: true,
      resize: true,
      contentEditable: false,
    });
    setSelectedId(id);
  }, [colorForAlignableOrder]);

  const onCreateRef = useCallback(
    (tierId: string, parentAlignableId: string) => {
      const id = elanPluginRef.current?.createRefAnnotation(
        tierId,
        parentAlignableId,
        "",
      );
      if (id) {
        setSelectedId(id);
      }
    },
    [],
  );

  const onDeleteAnnotation = useCallback(
    (id: string) => {
      const elan = elanPluginRef.current;
      const regions = regionsPluginRef.current;
      if (!elan) return;
      const r = regions?.getRegions().find((x) => x.id === id);
      r?.remove();
      eafIdsRef.current.delete(id);
      elan.deleteAnnotation(id);
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [],
  );

  const onEditValue = useCallback((id: string, value: string) => {
    const elan = elanPluginRef.current;
    if (!elan) return;
    elan.updateAnnotationText(id, value);
    const r = regionsPluginRef.current?.getRegions().find((x) => x.id === id);
    if (r) r.setContent(id);
  }, []);

  const onSelectBlock = useCallback((id: string, start: number) => {
    setSelectedId(id);
    const annot = elanPluginRef.current?.getData()?.annotations[id];
    if (!annot) return;
    if (annot.type === "ALIGNABLE_ANNOTATION") {
      const r = regionsPluginRef.current?.getRegions().find((x) => x.id === id);
      if (r) {
        r.play(true);
        return;
      }
    }
    wsRef.current?.setTime(start);
  }, []);

  // Keyboard shortcuts: Delete to remove, Enter to edit, Esc to deselect.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (!selectedId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onDeleteAnnotation(selectedId);
      } else if (e.key === "Enter") {
        e.preventDefault();
        wsRef.current?.playPause();
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, onDeleteAnnotation]);

  const openXml = () => {
    setXmlContent(elanPluginRef.current?.getEafXml() ?? null);
    setXmlOpen(true);
  };
  const closeXml = () => {
    setXmlOpen(false);
    setXmlContent(null);
  };

  const tierIds = elanData?.tiers.map((t) => t.id) ?? [];
  const selectedAnnot = selectedId ? elanData?.annotations[selectedId] : undefined;
  const alignableCount = elanData?.alignableAnnotations.length ?? 0;
  const refCount = elanData
    ? Object.values(elanData.annotations).filter(
        (annot) => annot.type === "REF_ANNOTATION",
      ).length
    : 0;

  // For the "+ ref to" buttons: tiers that have at least one REF annotation
  // and don't already host a ref to the selected alignable.
  let availableRefTiers: string[] = [];
  if (selectedAnnot && elanData) {
    const aligned =
      selectedAnnot.type === "ALIGNABLE_ANNOTATION"
        ? selectedAnnot
        : selectedAnnot.reference ?? null;
    if (aligned && aligned.id) {
      const taken = new Set<string>();
      for (const tier of elanData.tiers) {
        if (tier.annotations.some((a) => a.ref === aligned.id)) {
          taken.add(tier.id);
        }
      }
      availableRefTiers = elanData.tiers
        .filter((t) =>
          t.annotations.some((a) => a.type === "REF_ANNOTATION"),
        )
        .map((t) => t.id)
        .filter((id) => !taken.has(id));
    }
  }
  const selectedAligned =
    selectedAnnot?.type === "ALIGNABLE_ANNOTATION"
      ? selectedAnnot
      : selectedAnnot?.reference ?? null;

  const selectedDraftValue = selectedAnnot
    ? (draftById[selectedAnnot.id] ?? selectedAnnot.value ?? "")
    : "";

  const segmentRows = useMemo(() => {
    if (!elanTable) return [];
    return elanTable.rows.map((row) => {
      const textCells = row.cells.filter((cell) => !!cell.annotationId);
      const filled = textCells.filter((cell) => (cell.value ?? "").trim().length > 0)
        .length;
      const preview =
        textCells.find((cell) => (cell.value ?? "").trim().length > 0)?.value?.trim() ??
        "";
      const needsText = textCells.some((cell) => !(cell.value ?? "").trim());
      return {
        id: row.alignableId,
        start: row.start,
        end: row.end,
        preview,
        needsText,
        completion: `${filled}/${textCells.length || 0}`,
      };
    });
  }, [elanTable]);

  const filteredRows = useMemo(() => {
    const q = segmentQuery.trim().toLowerCase();
    return segmentRows.filter((row) => {
      if (showOnlyNeedsText && !row.needsText) return false;
      if (!q) return true;
      return row.id.toLowerCase().includes(q) || row.preview.toLowerCase().includes(q);
    });
  }, [segmentRows, segmentQuery, showOnlyNeedsText]);

  const activeSegmentId = selectedAligned?.id ?? null;
  const activeSegmentIndex = activeSegmentId
    ? segmentRows.findIndex((row) => row.id === activeSegmentId)
    : -1;
  const nextIncompleteSegment = segmentRows.find((row) => row.needsText) ?? null;

  const applySelectedDraft = useCallback(() => {
    if (!selectedAnnot) return;
    const value = draftById[selectedAnnot.id] ?? selectedAnnot.value ?? "";
    if (value !== selectedAnnot.value) {
      onEditValue(selectedAnnot.id, value);
    }
  }, [draftById, onEditValue, selectedAnnot]);

  const selectedRow =
    !elanTable || !selectedAligned?.id
      ? null
      : (elanTable.rows.find((row) => row.alignableId === selectedAligned.id) ??
        null);

  const updateSegmentTiming = useCallback(
    (alignableId: string, start: number, end: number) => {
      const elan = elanPluginRef.current;
      if (!elan) return;
      const total = duration > 0 ? duration : Number.MAX_SAFE_INTEGER;
      const safeStart = Math.max(0, Math.min(start, end, total));
      const safeEnd = Math.min(total, Math.max(safeStart + 0.01, end));
      elan.syncAlignableTimes(alignableId, safeStart, safeEnd);
      const region = regionsPluginRef.current
        ?.getRegions()
        .find((item) => item.id === alignableId) as
        | (ReturnType<InstanceType<typeof RegionsPlugin>["addRegion"]> & {
            setOptions?: (opts: { start?: number; end?: number }) => void;
          })
        | undefined;
      region?.setOptions?.({ start: safeStart, end: safeEnd });
    },
    [duration],
  );

  const commitTimingFromInputs = useCallback(() => {
    if (!selectedRow) return;
    const start = Number(startInputRef.current?.value ?? selectedRow.start);
    const end = Number(endInputRef.current?.value ?? selectedRow.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    updateSegmentTiming(selectedRow.alignableId, start, end);
  }, [selectedRow, updateSegmentTiming]);

  return (
    <div className="elan-demo space-y-4">
      <header className="elan-header border border-rule rounded-paper bg-paper shadow-paper px-4 py-3">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div>
            <h2 className="m-0 font-display text-[1.35rem] text-ink">ELAN Workflow</h2>
            <p className="m-0 mt-1 font-display italic text-[0.94rem] text-ink-soft">
              Queue segments, work one at a time, then audit completeness. Drag on
              the waveform to create a segment.
            </p>
          </div>
          <div className="flex-1" />
          <div className="flex flex-wrap gap-1.5">
            <span className="elan-meta-pill">{tierIds.length} tiers</span>
            <span className="elan-meta-pill">{alignableCount} segments</span>
            <span className="elan-meta-pill">{refCount} refs</span>
          </div>
        </div>
      </header>

      <div
        className={[
          "elan-shell grid gap-4",
          workflowMode === "compose"
            ? "xl:grid-cols-[minmax(0,1fr)_17rem]"
            : "xl:grid-cols-[minmax(0,1fr)]",
        ].join(" ")}
      >
        <section className="border border-rule rounded-paper bg-paper shadow-paper p-3 md:p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex bg-cream border border-ink rounded-paper overflow-hidden">
              <button
                type="button"
                onClick={() => setWorkflowMode("compose")}
                className={[
                  "px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.08em] border-r border-ink",
                  workflowMode === "compose"
                    ? "bg-ink text-cream"
                    : "text-ink-soft hover:text-ink",
                ].join(" ")}
              >
                Compose
              </button>
              <button
                type="button"
                onClick={() => setWorkflowMode("review")}
                className={[
                  "px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.08em]",
                  workflowMode === "review"
                    ? "bg-ink text-cream"
                    : "text-ink-soft hover:text-ink",
                ].join(" ")}
              >
                Review
              </button>
            </div>
            <span className="flex-1" />
            <button
              type="button"
              onClick={openXml}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-paper bg-transparent text-ink border border-ink font-mono text-[0.7rem] uppercase tracking-[0.08em] hover:bg-ink hover:text-cream transition"
            >
              <FileCode2 size={14} strokeWidth={1.75} />
              View XML
            </button>
          </div>

          <AudioControls wsRef={wsRef} />

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-[0.06em] text-ink-soft cursor-pointer">
              <input
                type="checkbox"
                checked={loopEnabled}
                onChange={(e) => setLoopEnabled(e.target.checked)}
                className="accent-ochre"
              />
              Loop selected
            </label>
          </div>

          <div
            ref={waveformRef}
            className="paper-hatched border border-rule rounded-paper min-h-[260px]"
          />

          {workflowMode === "compose" ? (
            <>

              <div className="inline-flex flex-wrap items-center gap-2 px-3 py-2 border border-rule rounded-paper bg-cream">
                <button
                  type="button"
                  onClick={onCreateAlignable}
                  disabled={!elanData || tierIds.length === 0}
                  className="inline-flex items-center gap-1.5 bg-ochre text-cream border border-ochre px-3 py-1.5 rounded-paper font-mono text-[0.72rem] uppercase tracking-[0.06em] font-semibold cursor-pointer transition hover:bg-ochre-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={14} strokeWidth={2} />
                  Add at playhead
                </button>
                <span className="hidden lg:inline-flex items-center gap-1.5 font-mono text-[0.66rem] uppercase tracking-[0.08em] text-ink-mute">
                  <CornerDownLeft size={11} strokeWidth={1.75} />
                  Enter play/pause · Del remove · Esc deselect
                </span>
              </div>

              {selectedAnnot ? (
                <section className="border border-rule rounded-paper bg-cream/65 p-3 md:p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="m-0 font-mono text-[0.68rem] uppercase tracking-widest text-ink-soft">
                      Unified Composer
                    </h3>
                    <code className="bg-paper text-ink px-1.5 py-0.5 rounded border border-rule font-mono text-[0.72rem]">
                      {selectedAligned?.id ?? selectedAnnot.id}
                    </code>
                    <span className="font-mono text-[0.66rem] uppercase tracking-[0.08em] text-ink-mute">
                      {selectedDraftValue.length} chars
                    </span>
                    <span className="flex-1" />
                    <button
                      type="button"
                      onClick={() => {
                        if (activeSegmentIndex > 0) {
                          const prev = segmentRows[activeSegmentIndex - 1];
                          if (prev) onSelectBlock(prev.id, prev.start);
                        }
                      }}
                      disabled={activeSegmentIndex <= 0}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-paper border border-rule bg-paper font-mono text-[0.64rem] uppercase tracking-[0.08em] text-ink-soft hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          activeSegmentIndex >= 0 &&
                          activeSegmentIndex < segmentRows.length - 1
                        ) {
                          const next = segmentRows[activeSegmentIndex + 1];
                          if (next) onSelectBlock(next.id, next.start);
                        }
                      }}
                      disabled={
                        activeSegmentIndex < 0 ||
                        activeSegmentIndex >= segmentRows.length - 1
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-paper border border-rule bg-paper font-mono text-[0.64rem] uppercase tracking-[0.08em] text-ink-soft hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (nextIncompleteSegment) {
                          onSelectBlock(
                            nextIncompleteSegment.id,
                            nextIncompleteSegment.start,
                          );
                        }
                      }}
                      disabled={!nextIncompleteSegment}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-paper border border-sage bg-transparent text-sage font-mono text-[0.64rem] uppercase tracking-[0.08em] hover:bg-sage hover:text-cream disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next incomplete
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteAnnotation(selectedAnnot.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-paper border border-blood bg-transparent text-blood font-mono text-[0.64rem] uppercase tracking-[0.08em] hover:bg-blood hover:text-cream"
                    >
                      <Trash2 size={12} strokeWidth={1.75} />
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setWriterOpen((cur) => !cur)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-paper border border-ink bg-transparent text-ink font-mono text-[0.64rem] uppercase tracking-[0.08em] hover:bg-ink hover:text-cream"
                    >
                      {writerOpen ? "Compact" : "Expand"}
                    </button>
                  </div>

                  {selectedRow ? (
                    <div className="mb-2 p-2.5 border border-rule-soft rounded-paper bg-paper flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[0.62rem] uppercase tracking-widest text-ink-mute">
                        Timing
                      </span>
                      <span className="font-display text-[0.95rem] text-ink-soft">
                        {formatElanTimestamp(selectedRow.start)} -{" "}
                        {formatElanTimestamp(selectedRow.end)}
                      </span>
                      <span className="flex-1" />
                      <label className="inline-flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-ink-soft">
                        Start
                        <input
                          key={`${selectedRow.alignableId}-start-${selectedRow.start}`}
                          ref={startInputRef}
                          type="number"
                          step="0.01"
                          defaultValue={selectedRow.start.toFixed(2)}
                          className="w-24 rounded-paper border border-rule bg-cream px-2 py-1 text-[0.74rem] text-ink"
                        />
                      </label>
                      <label className="inline-flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-ink-soft">
                        End
                        <input
                          key={`${selectedRow.alignableId}-end-${selectedRow.end}`}
                          ref={endInputRef}
                          type="number"
                          step="0.01"
                          defaultValue={selectedRow.end.toFixed(2)}
                          className="w-24 rounded-paper border border-rule bg-cream px-2 py-1 text-[0.74rem] text-ink"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={commitTimingFromInputs}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-paper border border-ink bg-cream text-ink font-mono text-[0.64rem] uppercase tracking-[0.08em] hover:bg-ink hover:text-cream"
                      >
                        Apply timing
                      </button>
                    </div>
                  ) : null}

                  <textarea
                    value={selectedDraftValue}
                    onChange={(e) =>
                      setDraftById((cur) => ({
                        ...cur,
                        [selectedAnnot.id]: e.target.value,
                      }))
                    }
                    onBlur={applySelectedDraft}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        applySelectedDraft();
                      }
                    }}
                    className={[
                      "w-full resize-y overflow-y-auto rounded-paper border border-rule bg-paper px-5 py-4 font-display text-[1.14rem] leading-[1.82] text-ink",
                      "focus:outline-none focus:ring-2 focus:ring-ochre/45",
                      writerOpen ? "h-[78vh] max-h-[88vh]" : "h-96 max-h-[72vh]",
                    ].join(" ")}
                    placeholder="Write full transcript text for this segment..."
                    aria-label={`Long-form text for ${selectedAnnot.id}`}
                  />

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="m-0 font-mono text-[0.63rem] uppercase tracking-[0.07em] text-ink-mute">
                      Cmd/Ctrl+Enter applies text
                    </p>
                    {selectedAligned && availableRefTiers.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {availableRefTiers.map((tierId) => (
                          <button
                            key={tierId}
                            type="button"
                            onClick={() => onCreateRef(tierId, selectedAligned.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-paper border border-sage bg-transparent text-sage font-mono text-[0.66rem] tracking-[0.04em] hover:bg-sage hover:text-cream transition"
                          >
                            <Plus size={11} strokeWidth={2} />
                            {tierId}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <span className="flex-1" />
                    <button
                      type="button"
                      onClick={applySelectedDraft}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-paper border border-ink bg-cream text-ink font-mono text-[0.66rem] uppercase tracking-[0.08em] hover:bg-ink hover:text-cream transition"
                    >
                      Apply text
                    </button>
                  </div>
                </section>
              ) : (
                <div className="border border-dashed border-rule rounded-paper p-6 text-center text-ink-soft font-display italic">
                  Select a segment from the queue to start composing.
                </div>
              )}
            </>
          ) : (
            <section className="space-y-3">
              <div className="elan-review-board w-full">
              {segmentRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    onSelectBlock(row.id, row.start);
                    setWorkflowMode("compose");
                  }}
                  className={[
                    "elan-review-row",
                    row.needsText ? "is-pending" : "",
                  ].join(" ")}
                >
                  <div className="elan-review-time">
                    {formatElanTimestamp(row.start)} - {formatElanTimestamp(row.end)}
                  </div>
                  <div className="elan-review-main">
                    <div className="elan-review-meta">
                      <span>{row.id}</span>
                      <span className="elan-review-completion">{row.completion}</span>
                    </div>
                    <p className="m-0">
                      {row.preview || (
                        <em className="not-italic text-[#8c8f95]">No text yet</em>
                      )}
                    </p>
                  </div>
                </button>
              ))}
              </div>
            </section>
          )}
        </section>

        {workflowMode === "compose" ? (
          <aside className="border border-rule rounded-paper bg-paper shadow-paper p-3 md:p-4 xl:sticky xl:top-3 h-fit max-h-[74vh] overflow-hidden flex flex-col">
            <div className="pb-2 border-b border-rule-soft">
              <h3 className="m-0 font-mono text-[0.68rem] uppercase tracking-widest text-ink-soft">
                Segment Queue
              </h3>
              <p className="m-0 mt-1 font-display text-[0.9rem] text-ink-mute">
                One segment at a time. No long-page jumping.
              </p>
            </div>
            <div className="pt-2 space-y-2">
              <input
                value={segmentQuery}
                onChange={(e) => setSegmentQuery(e.target.value)}
                placeholder="Search id or text..."
                className="w-full rounded-paper border border-rule bg-cream px-2.5 py-1.5 font-mono text-[0.73rem] text-ink placeholder:text-ink-mute/80 focus:outline-none focus:ring-2 focus:ring-ochre/35"
              />
              <label className="inline-flex items-center gap-1.5 font-mono text-[0.63rem] uppercase tracking-[0.08em] text-ink-soft cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyNeedsText}
                  onChange={(e) => setShowOnlyNeedsText(e.target.checked)}
                  className="accent-ochre"
                />
                Needs text only
              </label>
            </div>
            <div className="mt-2 flex-1 overflow-auto pr-1 space-y-1.5">
              {filteredRows.map((row) => {
                const isSelected = selectedAligned?.id === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => onSelectBlock(row.id, row.start)}
                    className={[
                      "elan-queue-row w-full text-left rounded-paper border px-2.5 py-2 transition",
                      isSelected
                        ? "border-ochre bg-ochre-soft/50"
                        : "border-rule-soft bg-cream hover:border-ink-soft hover:bg-paper-2/70",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-[0.66rem] text-ink-soft">{row.id}</code>
                      <span className="ml-auto font-mono text-[0.62rem] uppercase tracking-[0.08em] text-ink-mute">
                        {row.completion}
                      </span>
                    </div>
                    <p className="elan-queue-preview m-0 mt-1 font-display text-[0.9rem] leading-snug text-ink">
                      {row.preview || (
                        <em className="not-italic text-ink-mute">No text yet</em>
                      )}
                    </p>
                  </button>
                );
              })}
              {filteredRows.length === 0 ? (
                <p className="m-0 px-1 py-2 font-display italic text-[0.9rem] text-ink-mute">
                  No segments match this filter.
                </p>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>

      <XmlModal open={xmlOpen} xml={xmlContent} onClose={closeXml} />
    </div>
  );
}
