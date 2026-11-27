// The resizer (react-resizable-panels v2) sizes panels in percent of the
// group, so the list's 240px floor is turned into a percent of the group's
// measured width.
export const LIST_MIN_WIDTH_PX = 240;
export const LIST_DEFAULT_SIZE = 24;
export const LIST_MAX_SIZE = 40;
const UNMEASURED_MIN_SIZE = 16;

export function listMinSize(groupWidth: number): number {
  if (groupWidth <= 0) return UNMEASURED_MIN_SIZE;
  return Math.min(LIST_MAX_SIZE, (LIST_MIN_WIDTH_PX / groupWidth) * 100);
}
