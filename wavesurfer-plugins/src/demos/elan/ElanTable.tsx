import { Plus, X } from "lucide-react";
import {
  resolveAlignable,
  type ElanParsedData,
  type ElanTableViewModel,
} from "../../plugins/elan";
import { formatElanTimestamp } from "../../lib/format";

export function ElanTable({
  data,
  table,
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
  selectedId: string | null;
  editingId: string | null;
  onSelect: (id: string, start: number) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, value: string) => void;
  onCreateRef: (tierId: string, parentAlignableId: string) => void;
  setEditingId: (id: string | null) => void;
}) {
  const selectedAnnot = selectedId ? data.annotations[selectedId] : undefined;
  const selectedAligned = selectedAnnot ? resolveAlignable(selectedAnnot) : null;

  return (
    <div className="bg-paper border border-rule rounded-paper shadow-paper overflow-auto">
      <table className="w-full border-collapse font-display text-[0.95rem]">
        <thead>
          <tr>
            <th className="border border-rule px-2 py-1.5 text-left align-top bg-paper-2 font-mono text-[0.66rem] tracking-[0.12em] uppercase font-medium text-ink-soft">
              Time
            </th>
            {table.columns.map((col) => (
              <th
                key={col.tierId}
                className="border border-rule px-2 py-1.5 text-left align-top bg-paper-2 font-mono text-[0.66rem] tracking-[0.12em] uppercase font-medium text-ink-soft"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.tierId}
              </th>
            ))}
            <th className="w-7 border border-rule bg-paper-2" aria-label="actions" />
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => {
            const isActiveRow =
              selectedId === row.alignableId ||
              selectedAligned?.id === row.alignableId;
            return (
              <tr
                key={row.alignableId}
                className={[
                  ri % 2 === 0 ? "bg-transparent" : "bg-ochre-soft",
                  isActiveRow ? "bg-ochre-soft!" : "",
                  "group",
                ].join(" ")}
              >
                <td className="border border-rule px-2 py-1.5 align-top whitespace-nowrap font-mono text-[0.78rem] text-ochre tabular-nums">
                  {`${formatElanTimestamp(row.start)}–${formatElanTimestamp(row.end)}`}
                </td>
                {row.cells.map((cell) => {
                  const isEditing =
                    cell.annotationId && editingId === cell.annotationId;
                  const isSelectedCell =
                    cell.annotationId && selectedId === cell.annotationId;
                  return (
                    <td
                      key={`${row.alignableId}-${cell.tierId}`}
                      className={[
                        "border border-rule px-2 py-1.5 align-top cursor-pointer transition-colors",
                        "hover:bg-sage-soft",
                        isSelectedCell ? "outline-2 -outline-offset-2 outline-ochre" : "",
                      ].join(" ")}
                      onClick={() => {
                        if (cell.annotationId) {
                          onSelect(cell.annotationId, cell.start);
                        } else {
                          onSelect(row.alignableId, cell.start);
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (cell.annotationId) setEditingId(cell.annotationId);
                      }}
                    >
                      {cell.annotationId ? (
                        isEditing ? (
                          <input
                            autoFocus
                            defaultValue={cell.value}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={(e) => {
                              onEdit(cell.annotationId!, e.target.value);
                              setEditingId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                onEdit(cell.annotationId!, e.currentTarget.value);
                                setEditingId(null);
                              } else if (e.key === "Escape") {
                                setEditingId(null);
                              }
                            }}
                            className="w-full bg-cream border-0 outline-2 -outline-offset-2 outline-ochre font-display text-[0.95rem] px-1 py-0.5"
                          />
                        ) : (
                          <span className="inline-block min-h-4 leading-snug wrap-break-word whitespace-pre-wrap">
                            {cell.value || (
                              <em className="not-italic text-ink-mute opacity-60 tracking-widest">
                                —
                              </em>
                            )}
                          </span>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateRef(cell.tierId, row.alignableId);
                          }}
                          title={`Add ref on ${cell.tierId}`}
                          className="row-reveal inline-flex items-center gap-1 font-mono text-[0.62rem] uppercase tracking-[0.06em] text-ink-mute hover:text-sage transition"
                        >
                          <Plus size={10} strokeWidth={2} />
                          ref
                        </button>
                      )}
                    </td>
                  );
                })}
                <td className="border border-rule text-center align-middle">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(row.alignableId);
                    }}
                    aria-label={`Delete row ${row.alignableId}`}
                    className="row-reveal inline-flex items-center justify-center w-6 h-6 rounded-full text-blood hover:bg-blood hover:text-cream transition"
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
