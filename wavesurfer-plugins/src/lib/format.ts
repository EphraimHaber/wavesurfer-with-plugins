export function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/** Wall-clock style from seconds: millisecond precision, no float drift. */
export function formatElanTimestamp(sec: number): string {
  if (!Number.isFinite(sec)) return "—";
  const sign = sec < 0 ? "-" : "";
  let msTotal = Math.round(Math.abs(sec) * 1000);
  const frac = String(msTotal % 1000).padStart(3, "0");
  msTotal = Math.floor(msTotal / 1000);
  const s0 = msTotal % 60;
  const m = Math.floor(msTotal / 60) % 60;
  const h = Math.floor(msTotal / 3600);
  if (h > 0) {
    return `${sign}${h}:${String(m).padStart(2, "0")}:${String(s0).padStart(2, "0")}.${frac}`;
  }
  return `${sign}${m}:${String(s0).padStart(2, "0")}.${frac}`;
}

/** Distinct fill swatches taken from the page palette. */
export const REGION_COLORS = [
  "rgba(178, 90, 31, 0.32)", // ochre
  "rgba(79, 117, 96, 0.32)", // sage
  "rgba(200, 155, 63, 0.32)", // gold
  "rgba(122, 31, 31, 0.28)", // blood
  "rgba(136, 168, 150, 0.34)", // sage-2
  "rgba(232, 146, 73, 0.30)", // ochre-2
  "rgba(74, 63, 51, 0.24)", // ink-soft
] as const;

/** Stable colour for a known position in a list. */
export const colorForIndex = (i: number): string =>
  REGION_COLORS[((i % REGION_COLORS.length) + REGION_COLORS.length) % REGION_COLORS.length];

/** Stable colour derived from a string id (e.g. annotation id). */
export function colorForKey(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return REGION_COLORS[h % REGION_COLORS.length];
}
