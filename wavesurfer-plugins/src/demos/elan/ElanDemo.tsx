import { useCallback, useMemo, useState } from "react";
import { FileCode2 } from "lucide-react";
import { useElanWorkspace } from "./useElanWorkspace";
import { ElanWaveform } from "./ElanWaveform";
import { ElanComposer } from "./ElanComposer";
import { ElanQueue } from "./ElanQueue";
import { ElanReview } from "./ElanReview";
import { XmlModal } from "./XmlModal";
import { buildSegmentRows } from "./segmentRows";

export function ElanDemo() {
  const ws = useElanWorkspace();
  const {
    waveformRef,
    wsRef,
    elanData,
    elanTable,
    selectedId,
    setLoopEnabled,
    zoom,
    setZoom,
    zoomMin,
    zoomMax,
    createAlignableAtPlayhead,
    createRefAnnotation,
    deleteAnnotation,
    editValue,
    selectBlock,
    syncTiming,
    getEafXml,
  } = ws;

  const [loopEnabled, setLoopEnabledState] = useState(true);
  const [workflowMode, setWorkflowMode] = useState<"compose" | "review">(
    "compose",
  );
  const [xmlOpen, setXmlOpen] = useState(false);
  const [draftById, setDraftById] = useState<Record<string, string>>({});
  const [segmentQuery, setSegmentQuery] = useState("");
  const [showOnlyNeedsText, setShowOnlyNeedsText] = useState(false);
  const [writerOpen, setWriterOpen] = useState(false);

  const onLoopToggle = useCallback(
    (next: boolean) => {
      setLoopEnabledState(next);
      setLoopEnabled(next);
    },
    [setLoopEnabled],
  );

  const xmlContent = useMemo(
    () => (xmlOpen ? getEafXml() : null),
    [xmlOpen, getEafXml],
  );

  const segmentRows = useMemo(() => buildSegmentRows(elanTable), [elanTable]);

  const tierIds = elanData?.tiers.map((t) => t.id) ?? [];
  const selectedAnnot = selectedId
    ? elanData?.annotations[selectedId]
    : undefined;
  const alignableCount = elanData?.alignableAnnotations.length ?? 0;
  const refCount = elanData
    ? Object.values(elanData.annotations).filter(
        (annot) => annot.type === "REF_ANNOTATION",
      ).length
    : 0;
  const selectedAligned =
    selectedAnnot?.type === "ALIGNABLE_ANNOTATION"
      ? selectedAnnot
      : (selectedAnnot?.reference ?? null);

  const draftValue = selectedAnnot
    ? (draftById[selectedAnnot.id] ?? selectedAnnot.value ?? "")
    : "";

  const onDraftChange = useCallback((id: string, value: string) => {
    setDraftById((cur) => ({ ...cur, [id]: value }));
  }, []);

  const onApplyDraft = useCallback(() => {
    if (!selectedAnnot) return;
    const value = draftById[selectedAnnot.id] ?? selectedAnnot.value ?? "";
    if (value !== selectedAnnot.value) editValue(selectedAnnot.id, value);
  }, [draftById, editValue, selectedAnnot]);

  const onJumpFromReview = useCallback(
    (id: string, start: number) => {
      selectBlock(id, start);
      setWorkflowMode("compose");
    },
    [selectBlock],
  );

  return (
    <div className="elan-demo space-y-4">
      <header className="elan-header relative border border-rule rounded-paper bg-paper shadow-paper px-4 py-3">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div>
            <h2 className="m-0 font-display text-[1.35rem] text-ink">
              ELAN Workflow
            </h2>
            <p className="m-0 mt-1 font-display italic text-[0.94rem] text-ink-soft">
              Queue segments, work one at a time, then audit completeness. Drag
              on the waveform to create a segment.
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

      <section className="elan-shell relative border border-rule rounded-paper bg-paper shadow-paper">
        <div className="flex flex-wrap items-center gap-2 px-4 md:px-5 pt-3 pb-2 border-b border-rule-soft">
          <ModeTabs mode={workflowMode} onChange={setWorkflowMode} />
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setXmlOpen(true)}
            className="inline-flex items-center gap-1.5 font-mono text-[0.66rem] uppercase tracking-widest text-ink-soft hover:text-ochre underline-offset-4 hover:underline"
          >
            <FileCode2 size={13} strokeWidth={1.75} />
            View XML
          </button>
        </div>

        <div className="px-4 md:px-5 py-4 border-b border-rule-soft">
          <ElanWaveform
            waveformRef={waveformRef}
            wsRef={wsRef}
            loopEnabled={loopEnabled}
            onLoopToggle={onLoopToggle}
            zoom={zoom}
            onZoomChange={setZoom}
            zoomMin={zoomMin}
            zoomMax={zoomMax}
          />
        </div>

        {workflowMode === "compose" ? (
          <div className="grid xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="px-4 md:px-5 py-4">
              <ElanComposer
                elanData={elanData}
                elanTable={elanTable}
                segmentRows={segmentRows}
                selectedAnnot={selectedAnnot}
                selectedAligned={selectedAligned}
                draftValue={draftValue}
                onDraftChange={onDraftChange}
                onApplyDraft={onApplyDraft}
                hasTiers={tierIds.length > 0}
                writerOpen={writerOpen}
                onWriterToggle={() => setWriterOpen((cur) => !cur)}
                onCreateAtPlayhead={createAlignableAtPlayhead}
                onDelete={deleteAnnotation}
                onCreateRef={createRefAnnotation}
                onSelectBlock={selectBlock}
                onSyncTiming={syncTiming}
              />
            </div>
            <aside className="px-4 md:px-5 py-4 border-t xl:border-t-0 xl:border-l border-rule-soft xl:sticky xl:top-3 xl:h-fit">
              <ElanQueue
                segmentRows={segmentRows}
                selectedId={selectedAligned?.id ?? null}
                query={segmentQuery}
                onQueryChange={setSegmentQuery}
                showOnlyNeedsText={showOnlyNeedsText}
                onToggleNeedsText={setShowOnlyNeedsText}
                onSelectBlock={selectBlock}
              />
            </aside>
          </div>
        ) : (
          <div className="px-4 md:px-5 py-4">
            <ElanReview
              segmentRows={segmentRows}
              onJumpToSegment={onJumpFromReview}
            />
          </div>
        )}
      </section>

      <XmlModal
        open={xmlOpen}
        xml={xmlContent}
        onClose={() => setXmlOpen(false)}
      />
    </div>
  );
}

function ModeTabs({
  mode,
  onChange,
}: {
  mode: "compose" | "review";
  onChange: (m: "compose" | "review") => void;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex items-center gap-4 font-mono text-[0.7rem] uppercase tracking-[0.14em]"
    >
      {(["compose", "review"] as const).map((value) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(value)}
            className={[
              "relative pb-1 transition",
              active ? "text-ink" : "text-ink-mute hover:text-ink-soft",
            ].join(" ")}
          >
            {value}
            <span
              aria-hidden
              className={[
                "absolute bottom-[-7px] left-0 right-0 h-[2px] transition",
                active ? "bg-ochre" : "bg-transparent",
              ].join(" ")}
            />
          </button>
        );
      })}
    </div>
  );
}
