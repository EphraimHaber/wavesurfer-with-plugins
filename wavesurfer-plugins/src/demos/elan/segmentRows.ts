import type { ElanTableViewModel } from "../../plugins/elan";

export interface SegmentRow {
  id: string;
  start: number;
  end: number;
  preview: string;
  needsText: boolean;
  completion: string;
}

export function buildSegmentRows(
  table: ElanTableViewModel | null,
): SegmentRow[] {
  if (!table) return [];
  return table.rows.map((row) => {
    const textCells = row.cells.filter((cell) => !!cell.annotationId);
    const filled = textCells.filter(
      (cell) => (cell.value ?? "").trim().length > 0,
    ).length;
    const preview =
      textCells
        .find((cell) => (cell.value ?? "").trim().length > 0)
        ?.value?.trim() ?? "";
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
}
