/** `minutes` may be fractional (20s steps stored as seconds/60). */
export function formatMinutesForDisplay(minutes: number): string {
  const sec = Math.round(minutes * 60);
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  if (ss === 0) return `${mm} min`;
  return `${mm} min ${ss} sec`;
}

/** Short form for inline UI (e.g. home card). */
export function formatMinutesCompact(minutes: number): string {
  const sec = Math.round(minutes * 60);
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  if (ss === 0) return `${mm}m`;
  return `${mm}m ${ss}s`;
}
