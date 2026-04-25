import { useMemo } from "react";
import type { SegmentRow } from "./segmentRows";

interface Props {
  segmentRows: SegmentRow[];
  selectedId: string | null;
  query: string;
  onQueryChange: (q: string) => void;
  showOnlyNeedsText: boolean;
  onToggleNeedsText: (b: boolean) => void;
  onSelectBlock: (id: string, start: number) => void;
}

export function ElanQueue({
  segmentRows,
  selectedId,
  query,
  onQueryChange,
  showOnlyNeedsText,
  onToggleNeedsText,
  onSelectBlock,
}: Props) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return segmentRows.filter((row) => {
      if (showOnlyNeedsText && !row.needsText) return false;
      if (!q) return true;
      return (
        row.id.toLowerCase().includes(q) ||
        row.preview.toLowerCase().includes(q)
      );
    });
  }, [segmentRows, query, showOnlyNeedsText]);

  return (
    <div className="flex flex-col h-full max-h-[74vh]">
      <div className="flex items-baseline gap-3 pb-2">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ink-mute">
          Queue
        </span>
        <span className="font-mono text-[0.62rem] tracking-[0.05em] text-ink-mute">
          {filtered.length}/{segmentRows.length}
        </span>
      </div>
      <div className="space-y-2 pb-3">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="search id or text…"
          className="w-full border-b border-rule-soft bg-transparent px-1 py-1 font-mono text-[0.74rem] text-ink placeholder:text-ink-mute/70 focus:outline-none focus:border-ochre"
        />
        <label className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-soft cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyNeedsText}
            onChange={(e) => onToggleNeedsText(e.target.checked)}
            className="accent-ochre"
          />
          Needs text only
        </label>
      </div>

      <ol className="flex-1 overflow-auto pr-1 -mx-1">
        {filtered.map((row) => {
          const isSelected = selectedId === row.id;
          return (
            <li key={row.id} className="border-b border-rule-soft/60 last:border-b-0">
              <button
                type="button"
                onClick={() => onSelectBlock(row.id, row.start)}
                className={[
                  "group block w-full text-left px-3 py-2 transition relative",
                  isSelected
                    ? "bg-ochre-soft"
                    : "hover:bg-cream/70",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className={[
                    "absolute left-0 top-0 bottom-0 w-[3px]",
                    isSelected
                      ? "bg-ochre"
                      : row.needsText
                        ? "bg-blood/40"
                        : "bg-transparent group-hover:bg-rule-soft",
                  ].join(" ")}
                />
                <div className="flex items-center gap-2">
                  <code className="font-mono text-[0.66rem] text-ink-soft">
                    {row.id}
                  </code>
                  <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-mute">
                    {row.completion}
                  </span>
                </div>
                <p className="elan-queue-preview m-0 mt-1 font-display text-[0.92rem] leading-snug text-ink">
                  {row.preview || (
                    <em className="not-italic text-ink-mute">No text yet</em>
                  )}
                </p>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="px-1 py-3 font-display italic text-[0.9rem] text-ink-mute">
            No segments match this filter.
          </li>
        ) : null}
      </ol>
    </div>
  );
}
