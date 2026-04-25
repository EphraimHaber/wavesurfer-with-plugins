import { useCallback, useRef } from "react";
import { CornerDownLeft, Plus, Trash2 } from "lucide-react";
import type {
  ElanAnnotation,
  ElanParsedData,
  ElanTableViewModel,
} from "../../plugins/elan";
import { formatElanTimestamp } from "../../lib/format";
import type { SegmentRow } from "./segmentRows";

interface Props {
  elanData: ElanParsedData | null;
  elanTable: ElanTableViewModel | null;
  segmentRows: SegmentRow[];
  selectedAnnot: ElanAnnotation | undefined;
  selectedAligned: ElanAnnotation | null;
  draftValue: string;
  onDraftChange: (id: string, value: string) => void;
  onApplyDraft: () => void;
  hasTiers: boolean;
  writerOpen: boolean;
  onWriterToggle: () => void;
  onCreateAtPlayhead: () => void;
  onDelete: (id: string) => void;
  onCreateRef: (tierId: string, parentId: string) => void;
  onSelectBlock: (id: string, start: number) => void;
  onSyncTiming: (id: string, start: number, end: number) => void;
}

export function ElanComposer({
  elanData,
  elanTable,
  segmentRows,
  selectedAnnot,
  selectedAligned,
  draftValue,
  onDraftChange,
  onApplyDraft,
  hasTiers,
  writerOpen,
  onWriterToggle,
  onCreateAtPlayhead,
  onDelete,
  onCreateRef,
  onSelectBlock,
  onSyncTiming,
}: Props) {
  const startInputRef = useRef<HTMLInputElement | null>(null);
  const endInputRef = useRef<HTMLInputElement | null>(null);

  const selectedRow =
    !elanTable || !selectedAligned?.id
      ? null
      : (elanTable.rows.find((row) => row.alignableId === selectedAligned.id) ??
        null);

  const activeSegmentId = selectedAligned?.id ?? null;
  const activeSegmentIndex = activeSegmentId
    ? segmentRows.findIndex((row) => row.id === activeSegmentId)
    : -1;
  const nextIncompleteSegment = segmentRows.find((row) => row.needsText) ?? null;

  // Tiers that host REF annotations and don't already have one for the
  // selected alignable.
  let availableRefTiers: string[] = [];
  if (selectedAligned && elanData) {
    const taken = new Set<string>();
    for (const tier of elanData.tiers) {
      if (tier.annotations.some((a) => a.ref === selectedAligned.id)) {
        taken.add(tier.id);
      }
    }
    availableRefTiers = elanData.tiers
      .filter((t) => t.annotations.some((a) => a.type === "REF_ANNOTATION"))
      .map((t) => t.id)
      .filter((id) => !taken.has(id));
  }

  const commitTiming = useCallback(() => {
    if (!selectedRow) return;
    const start = Number(startInputRef.current?.value ?? selectedRow.start);
    const end = Number(endInputRef.current?.value ?? selectedRow.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    onSyncTiming(selectedRow.alignableId, start, end);
  }, [selectedRow, onSyncTiming]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          onClick={onCreateAtPlayhead}
          disabled={!elanData || !hasTiers}
          className="inline-flex items-center gap-1.5 bg-ochre text-cream border border-ochre px-3 py-1.5 rounded-paper font-mono text-[0.7rem] uppercase tracking-[0.08em] font-semibold cursor-pointer transition hover:bg-ochre-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={14} strokeWidth={2} />
          Add at playhead
        </button>
        <span className="hidden lg:inline-flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-ink-mute">
          <CornerDownLeft size={11} strokeWidth={1.75} />
          Enter play / Del remove / Esc deselect
        </span>
      </div>

      {!selectedAnnot ? (
        <div className="border-t border-b border-dashed border-rule-soft py-12 text-center font-display italic text-ink-mute">
          Select a segment from the queue, or drag on the waveform to create
          one.
        </div>
      ) : (
        <div className="space-y-3 border-t border-rule-soft pt-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ink-mute">
              Composer
            </span>
            <code className="font-mono text-[0.78rem] text-ink">
              {selectedAligned?.id ?? selectedAnnot.id}
            </code>
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.08em] text-ink-mute">
              {draftValue.length} chars
            </span>
            <span className="flex-1" />
            <ComposerNavButton
              onClick={() => {
                if (activeSegmentIndex > 0) {
                  const prev = segmentRows[activeSegmentIndex - 1];
                  if (prev) onSelectBlock(prev.id, prev.start);
                }
              }}
              disabled={activeSegmentIndex <= 0}
            >
              ← Prev
            </ComposerNavButton>
            <ComposerNavButton
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
            >
              Next →
            </ComposerNavButton>
            <ComposerNavButton
              onClick={() => {
                if (nextIncompleteSegment) {
                  onSelectBlock(
                    nextIncompleteSegment.id,
                    nextIncompleteSegment.start,
                  );
                }
              }}
              disabled={!nextIncompleteSegment}
              tone="sage"
            >
              Next incomplete
            </ComposerNavButton>
            <ComposerNavButton
              onClick={() => onDelete(selectedAnnot.id)}
              tone="blood"
            >
              <Trash2 size={11} strokeWidth={1.75} />
              Delete
            </ComposerNavButton>
            <ComposerNavButton onClick={onWriterToggle}>
              {writerOpen ? "Compact" : "Expand"}
            </ComposerNavButton>
          </div>

          {selectedRow ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ink-mute">
                Timing
              </span>
              <span className="font-display text-[0.92rem] text-ink-soft">
                {formatElanTimestamp(selectedRow.start)} —{" "}
                {formatElanTimestamp(selectedRow.end)}
              </span>
              <span className="flex-1" />
              <BareInput
                key={`${selectedRow.alignableId}-start-${selectedRow.start}`}
                inputRef={startInputRef}
                label="Start"
                defaultValue={selectedRow.start.toFixed(2)}
              />
              <BareInput
                key={`${selectedRow.alignableId}-end-${selectedRow.end}`}
                inputRef={endInputRef}
                label="End"
                defaultValue={selectedRow.end.toFixed(2)}
              />
              <button
                type="button"
                onClick={commitTiming}
                className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ink-soft hover:text-ochre underline-offset-4 hover:underline"
              >
                Apply timing
              </button>
            </div>
          ) : null}

          <textarea
            value={draftValue}
            onChange={(e) => onDraftChange(selectedAnnot.id, e.target.value)}
            onBlur={onApplyDraft}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                onApplyDraft();
              }
            }}
            className={[
              "w-full resize-y bg-transparent",
              "font-display text-[1.14rem] leading-[1.82] text-ink",
              "border-y border-rule-soft px-1 py-4",
              "focus:outline-none focus:border-ochre focus:ring-0",
              writerOpen ? "h-[78vh] max-h-[88vh]" : "h-[24rem] max-h-[72vh]",
            ].join(" ")}
            placeholder="Write full transcript text for this segment…"
            aria-label={`Long-form text for ${selectedAnnot.id}`}
          />

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="m-0 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-mute">
              ⌘/Ctrl+Enter applies text
            </p>
            {selectedAligned && availableRefTiers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {availableRefTiers.map((tierId) => (
                  <button
                    key={tierId}
                    type="button"
                    onClick={() => onCreateRef(tierId, selectedAligned.id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-paper border border-sage/60 bg-transparent text-sage font-mono text-[0.64rem] tracking-[0.05em] hover:bg-sage hover:text-cream transition"
                  >
                    <Plus size={10} strokeWidth={2} />
                    {tierId}
                  </button>
                ))}
              </div>
            ) : null}
            <span className="flex-1" />
            <button
              type="button"
              onClick={onApplyDraft}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-paper border border-ink bg-cream text-ink font-mono text-[0.66rem] uppercase tracking-[0.1em] hover:bg-ink hover:text-cream transition"
            >
              Apply text
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ComposerNavButton({
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "sage" | "blood";
}) {
  const toneClasses = {
    default: "text-ink-soft hover:text-ink",
    sage: "text-sage hover:text-sage-2",
    blood: "text-blood hover:text-ink",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center gap-1 font-mono text-[0.64rem] uppercase tracking-[0.1em]",
        "underline-offset-4 hover:underline",
        "disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline",
        toneClasses,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function BareInput({
  inputRef,
  label,
  defaultValue,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-mute">
      {label}
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        defaultValue={defaultValue}
        className="w-20 border-b border-rule-soft bg-transparent px-1 py-0.5 text-[0.78rem] text-ink focus:outline-none focus:border-ochre"
      />
    </label>
  );
}
