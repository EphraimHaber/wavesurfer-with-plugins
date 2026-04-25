import { useEffect, useRef } from "react";
import { resolveAlignable, type ElanParsedData, type ElanTableViewModel } from "../../plugins/elan";
import { formatElanTimestamp } from "../../lib/format";

export type ElanLaneBlock = {
  id: string;
  alignableId: string;
  isAlignable: boolean;
  start: number;
  end: number;
  value: string;
};

export function ElanLanes({
  data,
  table,
  duration,
  selectedId,
  editingId,
  onSelect,
  onDelete,
  onEdit,
  onCreateRef,
  setEditingId,
}: {
  data: ElanParsedData;
  table: ElanTableViewModel;
  duration: number;
  selectedId: string | null;
  editingId: string | null;
  onSelect: (id: string, start: number) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, value: string) => void;
  onCreateRef: (tierId: string, parentAlignableId: string) => void;
  setEditingId: (id: string | null) => void;
}) {
  const lanes = table.columns.map((col) => {
    const tier = data.tiers[col.tierIndex];
    const blocks: ElanLaneBlock[] = [];
    for (const annot of tier.annotations) {
      const aligned = resolveAlignable(annot);
      if (!aligned || aligned.start == null || aligned.end == null) continue;
      blocks.push({
        id: annot.id,
        alignableId: aligned.id,
        isAlignable: annot.type === "ALIGNABLE_ANNOTATION",
        start: aligned.start,
        end: aligned.end,
        value: annot.value,
      });
    }
    blocks.sort((a, b) => a.start - b.start || a.end - b.end);
    const hasAlignable = blocks.some((b) => b.isAlignable);
    return {
      tierId: col.tierId,
      blocks,
      isRefTier: !hasAlignable && blocks.length > 0,
    };
  });

  const tickCount = 8;
  const ticks = Array.from(
    { length: tickCount + 1 },
    (_, i) => (duration * i) / tickCount,
  );

  const selectedAnnot = selectedId ? data.annotations[selectedId] : null;
  const selectedAlignable = selectedAnnot ? resolveAlignable(selectedAnnot) : null;

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // Auto-scroll the selected block into view when selection changes.
  useEffect(() => {
    if (!selectedId || !scrollerRef.current) return;
    const el = scrollerRef.current.querySelector<HTMLElement>(
      `[data-block-id="${CSS.escape(selectedId)}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedId]);

  return (
    <div
      ref={scrollerRef}
      className="elan-lanes bg-paper border border-rule rounded-paper overflow-x-auto overflow-y-hidden shadow-paper"
      role="region"
      aria-label="ELAN lanes"
    >
      {/* Ruler */}
      <div className="flex items-stretch bg-paper-2 border-b border-rule h-9 relative">
        <div className="flex-[0_0_var(--label-w)] border-r border-rule bg-paper relative">
          <span className="absolute bottom-1 right-2 font-mono text-[0.62rem] tracking-widest uppercase text-ink-mute">
            00:00 ⁘
          </span>
        </div>
        <div className="flex-1 relative min-w-0">
          <div className="absolute left-0 right-0 bottom-0 h-px bg-rule opacity-60" aria-hidden />
          {ticks.map((t, i) => (
            <div key={i} className="elan-tick" style={{ left: `${(t / duration) * 100}%` }}>
              <span className="elan-tick-mark" aria-hidden />
              <span className="font-mono text-[0.62rem] tabular-nums text-ink-mute pl-1 pt-0.5 whitespace-nowrap">
                {formatElanTimestamp(t)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Lanes */}
      {lanes.map((lane, laneIndex) => (
        <div
          key={lane.tierId}
          className={[
            "elan-lane border-t border-rule first-of-type:border-t-0",
            lane.isRefTier ? "is-ref-tier bg-sage-soft" : "",
          ].join(" ")}
          style={{ "--lane-hue": `${(laneIndex * 53) % 360}deg` } as React.CSSProperties}
        >
          {/* Label */}
          <div className="elan-lane-label py-2 px-3 border-r border-rule bg-paper-2 flex flex-col justify-center gap-1 pl-4">
            <span
              className="font-display font-medium text-[0.95rem] text-ink leading-tight"
              style={{ fontVariationSettings: '"opsz" 14, "SOFT" 30' }}
            >
              {lane.tierId}
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-ink-mute">
              <span className="bg-cream border border-rule rounded-full px-1.5 min-w-[1.5em] text-center tabular-nums">
                {lane.blocks.length}
              </span>
              <span>{lane.isRefTier ? "ref" : "align"}</span>
            </span>
            {lane.isRefTier &&
            selectedAlignable &&
            !lane.blocks.some((b) => b.alignableId === selectedAlignable.id) ? (
              <button
                type="button"
                onClick={() => onCreateRef(lane.tierId, selectedAlignable.id)}
                title={`Add ref to ${selectedAlignable.id}`}
                className="absolute top-2 right-2 font-mono text-[0.6rem] uppercase tracking-[0.04em] bg-sage text-cream rounded-full px-2 py-0.5 cursor-pointer hover:-translate-y-px transition"
              >
                + ref
              </button>
            ) : null}
          </div>

          {/* Track */}
          <div className="elan-lane-track">
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              {ticks.map((_, i) => (
                <div
                  key={i}
                  className="elan-lane-grid-line"
                  style={{ left: `${(i / tickCount) * 100}%` }}
                />
              ))}
            </div>
            {lane.blocks.map((b) => {
              const left = (b.start / duration) * 100;
              const widthPct = ((b.end - b.start) / duration) * 100;
              const width = Math.max(0.6, widthPct);
              const isSel = selectedId === b.id;
              const isEdit = editingId === b.id;
              return (
                <div
                  key={b.id}
                  data-block-id={b.id}
                  className={[
                    "elan-block",
                    isSel ? "is-selected" : "",
                    b.isAlignable ? "is-alignable" : "is-ref",
                  ].join(" ")}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(b.id, b.start);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(b.id);
                  }}
                  title={`${formatElanTimestamp(b.start)} – ${formatElanTimestamp(b.end)}\n${b.value || "(empty)"}`}
                >
                  {isEdit ? (
                    <input
                      autoFocus
                      defaultValue={b.value}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        onEdit(b.id, e.target.value);
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onEdit(b.id, e.currentTarget.value);
                          setEditingId(null);
                        } else if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                      className="flex-1 min-w-0 bg-cream border-0 outline-2 -outline-offset-2 outline-ochre font-display text-[0.85rem] px-1"
                    />
                  ) : (
                    <>
                      <span className="elan-block-text flex-1 pl-1.5 pr-1">
                        {b.value || (
                          <em className="not-italic text-ink-mute opacity-60 tracking-widest">
                            —
                          </em>
                        )}
                      </span>
                      <button
                        type="button"
                        className="elan-block-delete shrink-0 bg-transparent text-blood border-0 cursor-pointer text-[1.05rem] leading-none w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-blood hover:text-cream"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(b.id);
                        }}
                        aria-label={`Delete annotation ${b.id}`}
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
