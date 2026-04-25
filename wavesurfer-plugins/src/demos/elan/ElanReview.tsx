import { formatElanTimestamp } from "../../lib/format";
import type { SegmentRow } from "./segmentRows";

interface Props {
  segmentRows: SegmentRow[];
  onJumpToSegment: (id: string, start: number) => void;
}

export function ElanReview({ segmentRows, onJumpToSegment }: Props) {
  return (
    <div className="elan-review-board w-full">
      {segmentRows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onJumpToSegment(row.id, row.start)}
          className={[
            "elan-review-row",
            row.needsText ? "is-pending" : "",
          ].join(" ")}
        >
          <div className="elan-review-time">
            {formatElanTimestamp(row.start)} — {formatElanTimestamp(row.end)}
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
  );
}
