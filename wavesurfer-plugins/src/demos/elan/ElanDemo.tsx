import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import { motion, AnimatePresence } from "motion/react";
import {
  AlignLeft,
  FileCode2,
  Plus,
  Rows3,
  Table2,
  Trash2,
  Pencil,
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
import { colorForIndex } from "../../lib/format";
import { ElanLanes } from "./ElanLanes";
import { ElanDocument } from "./ElanDocument";
import { ElanTable } from "./ElanTable";
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
  const [workflowMode, setWorkflowMode] = useState<
    "capture" | "compose" | "review"
  >("compose");
  const [duration, setDuration] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createTier, setCreateTier] = useState<string>("");
  const [xmlOpen, setXmlOpen] = useState(false);
  const [xmlContent, setXmlContent] = useState<string | null>(null);
  const [draftById, setDraftById] = useState<Record<string, string>>({});
  const [segmentQuery, setSegmentQuery] = useState("");
  const [showOnlyNeedsText, setShowOnlyNeedsText] = useState(false);

  // Keep latest selected tier accessible from event handlers without re-binding
  useEffect(() => {
    createTierRef.current = createTier;
  }, [createTier]);

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
      if (data.tiers[0]) setCreateTier(data.tiers[0].id);
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
      setEditingId(newId);
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
      setEditingId(null);
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
    if (!ws || !elan || !regions || !createTier) return;
    const start = ws.getCurrentTime();
    const end = Math.min(start + 1.5, ws.getDuration());
    const id = elan.createAlignableAnnotation(createTier, start, end, "");
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
    setEditingId(id);
  }, [colorForAlignableOrder, createTier]);

  const onCreateRef = useCallback(
    (tierId: string, parentAlignableId: string) => {
      const id = elanPluginRef.current?.createRefAnnotation(
        tierId,
        parentAlignableId,
        "",
      );
      if (id) {
        setSelectedId(id);
        setEditingId(id);
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
      setEditingId((cur) => (cur === id ? null : cur));
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
        setEditingId(selectedId);
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

  const view =
    workflowMode === "capture"
      ? "lanes"
      : workflowMode === "compose"
        ? "document"
        : "table";
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

  return (
    <div className="elan-demo space-y-4">
      <header className="elan-header border border-rule rounded-paper bg-paper shadow-paper px-4 py-3">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div>
            <h2 className="m-0 font-display text-[1.35rem] text-ink">ELAN Workflow</h2>
            <p className="m-0 mt-1 font-display italic text-[0.94rem] text-ink-soft">
              Queue segments, work one at a time, then audit completeness.
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

      <AudioControls wsRef={wsRef} />

      <div className="elan-shell grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
        <aside className="border border-rule rounded-paper bg-paper shadow-paper p-3 md:p-4 xl:sticky xl:top-3 h-fit max-h-[74vh] overflow-hidden flex flex-col">
          <div className="pb-2 border-b border-rule-soft">
            <h3 className="m-0 font-mono text-[0.68rem] uppercase tracking-widest text-ink-soft">
              Segment Queue
            </h3>
            <p className="m-0 mt-1 font-display text-[0.9rem] text-ink-mute">
              Work through transcript chunks in order.
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
                    {row.preview || <em className="not-italic text-ink-mute">No text yet</em>}
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

        <section className="border border-rule rounded-paper bg-paper shadow-paper p-3 md:p-4 space-y-3">
          <div className="elan-mode-grid">
            {(
              [
                {
                  id: "capture",
                  title: "Capture",
                  subtitle: "Create and trim segments",
                  Icon: Rows3,
                },
                {
                  id: "compose",
                  title: "Compose",
                  subtitle: "Write transcript and notes",
                  Icon: AlignLeft,
                },
                {
                  id: "review",
                  title: "Review",
                  subtitle: "Scan table for gaps",
                  Icon: Table2,
                },
              ] as const
            ).map(({ id, title, subtitle, Icon }) => {
              const active = workflowMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setWorkflowMode(id)}
                  className={[
                    "elan-mode-card rounded-paper border px-3 py-2 text-left transition",
                    active
                      ? "border-ink bg-ink text-cream"
                      : "border-rule-soft bg-cream hover:border-ink-soft",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} strokeWidth={1.75} />
                    <span className="font-mono text-[0.68rem] uppercase tracking-widest">
                      {title}
                    </span>
                  </div>
                  <p
                    className={[
                      "m-0 mt-1 font-display text-[0.88rem] leading-snug",
                      active ? "text-cream/85" : "text-ink-soft",
                    ].join(" ")}
                  >
                    {subtitle}
                  </p>
                </button>
              );
            })}
          </div>

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

          <div
            ref={waveformRef}
            className="paper-hatched border border-rule rounded-paper min-h-[260px]"
          />

          <div className="flex flex-wrap items-center gap-2 px-3 py-2 border border-rule rounded-paper bg-cream">
            <span
              className="font-display italic text-[0.92rem] text-ink-soft"
              style={{ fontVariationSettings: '"opsz" 14, "SOFT" 80' }}
            >
              Drag to create a segment, or add one at the playhead:
            </span>
            <div className="inline-flex bg-cream border border-ink rounded-paper overflow-hidden">
              <select
                value={createTier}
                onChange={(e) => setCreateTier(e.target.value)}
                className="bg-transparent text-ink border-0 border-r border-ink px-2 py-1.5 font-mono text-[0.78rem] cursor-pointer focus:outline-none focus:bg-paper-2"
                aria-label="Tier for new annotation"
              >
                {tierIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onCreateAlignable}
                disabled={!createTier || !elanData}
                className="inline-flex items-center gap-1.5 bg-ochre text-cream border-0 px-3 py-1.5 font-mono text-[0.72rem] uppercase tracking-[0.06em] font-semibold cursor-pointer transition hover:bg-ochre-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={14} strokeWidth={2} />
                Add at playhead
              </button>
            </div>
            <span className="flex-1" />
            <span className="hidden lg:inline-flex items-center gap-1.5 font-mono text-[0.66rem] uppercase tracking-[0.08em] text-ink-mute">
              <CornerDownLeft size={11} strokeWidth={1.75} />
              Enter edit · Del remove · Esc deselect
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="elan-view-shell"
            >
              {view === "document" ? (
                elanData && elanTable ? (
                  <ElanDocument
                    data={elanData}
                    table={elanTable}
                    selectedId={selectedId}
                    onSelect={onSelectBlock}
                    onEdit={onEditValue}
                    onCreateRef={onCreateRef}
                  />
                ) : (
                  <EmptyLoading />
                )
              ) : view === "lanes" ? (
                elanData && elanTable && duration > 0 ? (
                  <ElanLanes
                    data={elanData}
                    table={elanTable}
                    duration={duration}
                    selectedId={selectedId}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    onSelect={onSelectBlock}
                    onDelete={onDeleteAnnotation}
                    onEdit={onEditValue}
                    onCreateRef={onCreateRef}
                  />
                ) : (
                  <EmptyLoading />
                )
              ) : elanData && elanTable ? (
                <ElanTable
                  data={elanData}
                  table={elanTable}
                  selectedId={selectedId}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  onSelect={onSelectBlock}
                  onDelete={onDeleteAnnotation}
                  onEdit={onEditValue}
                  onCreateRef={onCreateRef}
                />
              ) : (
                <EmptyLoading />
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        <aside className="border border-rule rounded-paper bg-paper shadow-paper p-3 md:p-4 xl:sticky xl:top-3 h-fit">
          <AnimatePresence mode="wait" initial={false}>
            {selectedAnnot ? (
              <motion.div
                key="selection"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="space-y-3"
              >
                <div className="pb-2 border-b border-rule-soft">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full bg-ochre shrink-0"
                      style={{ boxShadow: "0 0 0 3px rgba(178,90,31,0.18)" }}
                      aria-hidden
                    />
                    <code className="bg-cream text-ink px-1.5 py-0.5 rounded border border-rule font-mono text-[0.72rem]">
                      {selectedAnnot.id}
                    </code>
                    <span className="text-[0.62rem] uppercase tracking-[0.12em] text-sage border border-sage rounded-full px-2 py-0.5 font-mono">
                      {selectedAnnot.type === "ALIGNABLE_ANNOTATION"
                        ? "alignable"
                        : "ref"}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[0.66rem] uppercase tracking-[0.08em] text-ink-soft">
                      Text
                    </span>
                    <span className="font-mono text-[0.68rem] tabular-nums text-ink-mute">
                      {selectedDraftValue.length} chars
                    </span>
                  </div>
                  <textarea
                    value={selectedDraftValue}
                    onChange={(e) =>
                      setDraftById((cur) => ({
                        ...cur,
                        [selectedAnnot.id]: e.target.value,
                      }))
                    }
                    onBlur={() => {
                      if (selectedDraftValue !== selectedAnnot.value) {
                        onEditValue(selectedAnnot.id, selectedDraftValue);
                      }
                    }}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        if (selectedDraftValue !== selectedAnnot.value) {
                          onEditValue(selectedAnnot.id, selectedDraftValue);
                        }
                      }
                    }}
                    className="w-full min-h-28 resize-y rounded-paper border border-rule bg-cream px-3 py-2 font-display text-[0.95rem] leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-ochre/45"
                    placeholder="Annotation text..."
                    aria-label={`Annotation text for ${selectedAnnot.id}`}
                  />
                  <p className="m-0 mt-1.5 font-mono text-[0.63rem] uppercase tracking-[0.07em] text-ink-mute">
                    Cmd/Ctrl+Enter to apply now
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(selectedAnnot.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-paper border border-ink bg-cream text-ink font-mono text-[0.68rem] uppercase tracking-[0.08em] hover:bg-ink hover:text-cream transition"
                  >
                    <Pencil size={12} strokeWidth={1.75} />
                    Inline edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteAnnotation(selectedAnnot.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-paper border border-blood bg-cream text-blood font-mono text-[0.68rem] uppercase tracking-[0.08em] hover:bg-blood hover:text-cream transition"
                  >
                    <Trash2 size={12} strokeWidth={1.75} />
                    Delete
                  </button>
                </div>

                {selectedAligned && availableRefTiers.length > 0 ? (
                  <div className="pt-2 border-t border-rule-soft">
                    <p className="m-0 mb-1.5 font-mono text-[0.62rem] uppercase tracking-widest text-ink-mute">
                      Add reference on tier
                    </p>
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
                  </div>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="empty-selection"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="space-y-3"
              >
                <h3 className="m-0 font-mono text-[0.68rem] uppercase tracking-widest text-ink-soft">
                  Inspector
                </h3>
                <p
                  className="m-0 font-display italic text-[0.95rem] text-ink-soft"
                  style={{ fontVariationSettings: '"opsz" 14, "SOFT" 70' }}
                >
                  Select an annotation in the waveform, document, lanes, or table.
                </p>
                <div className="border border-rule-soft rounded-paper bg-cream px-3 py-2">
                  <p className="m-0 mb-1 font-mono text-[0.62rem] uppercase tracking-widest text-ink-mute">
                    Workflow
                  </p>
                  <ol className="m-0 pl-4 space-y-1 font-display text-[0.9rem] text-ink-soft">
                    <li>Create or pick a segment.</li>
                    <li>Type text in the inspector.</li>
                    <li>Add reference comments from note tiers.</li>
                  </ol>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>

      <XmlModal open={xmlOpen} xml={xmlContent} onClose={closeXml} />
    </div>
  );
}

function EmptyLoading() {
  return (
    <div
      className="font-display italic text-[1rem] text-ink-soft p-6 text-center border border-dashed border-rule rounded-paper"
      style={{ fontVariationSettings: '"opsz" 14, "SOFT" 80' }}
    >
      Loading transcript…
    </div>
  );
}
