/** Change against the previous period in whole percent; null with no baseline. */
export function deltaPercent(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}
