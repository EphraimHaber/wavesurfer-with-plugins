import { useMemo, useState } from "react";
import type { ElanParsedData, ElanTableViewModel } from "../../plugins/elan";
import { formatElanTimestamp } from "../../lib/format";

type DraftMap = Record<string, string>;

export function ElanDocument({
  data,
  table,
  selectedId,
  onSelect,
  onEdit,
  onCreateRef,
}: {
  data: ElanParsedData;
  table: ElanTableViewModel;
  selectedId: string | null;
  onSelect: (id: string, start: number) => void;
  onEdit: (id: string, value: string) => void;
  onCreateRef: (tierId: string, parentAlignableId: string) => void;
}) {
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({});

  const noteTierIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tier of data.tiers) {
      if (tier.annotations.some((a) => a.type === "REF_ANNOTATION")) {
        ids.add(tier.id);
      }
    }
    return ids;
  }, [data]);

  return (
    <div className="bg-paper border border-rule rounded-paper shadow-paper px-3 md:px-4">
      {table.rows.map((row) => (
        <section
          key={row.alignableId}
          className={[
            "py-4 border-b border-rule-soft last:border-b-0",
            selectedId === row.alignableId ? "bg-ochre-soft/45 -mx-3 md:-mx-4 px-3 md:px-4" : "",
          ].join(" ")}
        >
          <header className="flex flex-wrap items-center gap-2 mb-3">
            <button
              type="button"
              className="font-mono text-[0.64rem] uppercase tracking-[0.08em] bg-paper border border-rule rounded-paper px-2 py-1 text-ink hover:bg-paper-2"
              onClick={() => onSelect(row.alignableId, row.start)}
            >
              Segment {row.alignableId}
            </button>
            <span className="font-mono text-[0.74rem] tabular-nums text-ochre">
              {`${formatElanTimestamp(row.start)} - ${formatElanTimestamp(row.end)}`}
            </span>
          </header>

          <div className="flex flex-col gap-2.5">
            {row.cells.map((cell) => {
              const annot = cell.annotationId
                ? data.annotations[cell.annotationId]
                : undefined;
              const isNoteCell =
                noteTierIds.has(cell.tierId) ||
                annot?.type === "REF_ANNOTATION";
              if (isNoteCell) return null;

              const isSelected = !!cell.annotationId && selectedId === cell.annotationId;
              return (
                <div
                  key={`${row.alignableId}-${cell.tierId}`}
                  className={[
                    "flex flex-col md:flex-row md:items-start gap-2 md:gap-3",
                    "px-2 py-2 rounded-paper border border-transparent",
                    isSelected ? "bg-sage-soft/50 border-sage/40" : "hover:bg-paper-2/55",
                  ].join(" ")}
                >
                  <div className="md:w-38 shrink-0 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="font-mono text-[0.64rem] uppercase tracking-[0.08em] text-ink-soft hover:text-ink"
                      onClick={() => onSelect(cell.annotationId ?? row.alignableId, cell.start)}
                    >
                      {cell.tierId}
                    </button>
                    <span className="font-mono text-[0.62rem] text-ink-mute tabular-nums">
                      {(cell.annotationId
                        ? (drafts[cell.annotationId] ?? cell.value ?? "")
                        : "").length} chars
                    </span>
                  </div>
                  {cell.annotationId ? (
                    <textarea
                      value={drafts[cell.annotationId] ?? cell.value ?? ""}
                      onChange={(e) =>
                        setDrafts((cur) => ({
                          ...cur,
                          [cell.annotationId!]: e.target.value,
                        }))
                      }
                      onFocus={() => onSelect(cell.annotationId!, cell.start)}
                      onBlur={(e) => onEdit(cell.annotationId!, e.target.value)}
                      className="w-full min-h-20 resize-y rounded-paper border border-rule bg-cream px-2.5 py-2 font-display text-[0.96rem] leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-ochre/45"
                      placeholder={`${cell.tierId} text`}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCreateRef(cell.tierId, row.alignableId)}
                      className="inline-flex items-center w-fit px-2.5 py-1.5 rounded-paper border border-sage text-sage bg-transparent font-mono text-[0.66rem] uppercase tracking-[0.06em] hover:bg-sage hover:text-cream transition"
                    >
                      Add comment in {cell.tierId}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {(() => {
            const noteCells = row.cells.filter((cell) => {
              const annot = cell.annotationId
                ? data.annotations[cell.annotationId]
                : undefined;
              return (
                noteTierIds.has(cell.tierId) || annot?.type === "REF_ANNOTATION"
              );
            });
            if (noteCells.length === 0) return null;
            const isOpen = !!notesOpen[row.alignableId];
            return (
              <div className="mt-3 pt-2 border-t border-rule-soft">
                <button
                  type="button"
                  onClick={() =>
                    setNotesOpen((cur) => ({
                      ...cur,
                      [row.alignableId]: !cur[row.alignableId],
                    }))
                  }
                  className="inline-flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-sage hover:text-ink"
                >
                  <span
                    aria-hidden
                    className={[
                      "inline-block transition-transform",
                      isOpen ? "rotate-90" : "",
                    ].join(" ")}
                  >
                    ▶
                  </span>
                  Notes thread ({noteCells.length})
                </button>

                {isOpen ? (
                  <div className="mt-2 pl-4 border-l-2 border-sage-soft flex flex-col gap-2.5">
                    {noteCells.map((cell) => {
                      const isSelected =
                        !!cell.annotationId && selectedId === cell.annotationId;
                      return (
                        <div
                          key={`${row.alignableId}-${cell.tierId}`}
                          className={[
                            "flex flex-col md:flex-row md:items-start gap-2 md:gap-3",
                            "px-2 py-2 rounded-paper border border-transparent bg-paper/35",
                            isSelected ? "border-sage/40 bg-sage-soft/45" : "",
                          ].join(" ")}
                        >
                          <div className="md:w-38 shrink-0 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              className="font-mono text-[0.64rem] uppercase tracking-[0.08em] text-ink-soft hover:text-ink"
                              onClick={() =>
                                onSelect(
                                  cell.annotationId ?? row.alignableId,
                                  cell.start,
                                )
                              }
                            >
                              {cell.tierId}
                            </button>
                            <span className="font-mono text-[0.62rem] text-ink-mute tabular-nums">
                              {(cell.annotationId
                                ? (drafts[cell.annotationId] ?? cell.value ?? "")
                                : "").length} chars
                            </span>
                          </div>

                          {cell.annotationId ? (
                            <textarea
                              value={drafts[cell.annotationId] ?? cell.value ?? ""}
                              onChange={(e) =>
                                setDrafts((cur) => ({
                                  ...cur,
                                  [cell.annotationId!]: e.target.value,
                                }))
                              }
                              onFocus={() => onSelect(cell.annotationId!, cell.start)}
                              onBlur={(e) => onEdit(cell.annotationId!, e.target.value)}
                              className="w-full min-h-18 resize-y rounded-paper border border-rule bg-cream px-2.5 py-2 font-display text-[0.95rem] leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-sage/40"
                              placeholder={`${cell.tierId} note`}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                onCreateRef(cell.tierId, row.alignableId)
                              }
                              className="inline-flex items-center w-fit px-2.5 py-1.5 rounded-paper border border-sage text-sage bg-transparent font-mono text-[0.66rem] uppercase tracking-[0.06em] hover:bg-sage hover:text-cream transition"
                            >
                              Add comment in {cell.tierId}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })()}
        </section>
      ))}
    </div>
  );
}
