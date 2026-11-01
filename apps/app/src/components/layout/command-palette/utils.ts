/** Lowercases and strips Vietnamese diacritics, so "khach hang" matches "Khách hàng". */
export const normalizeSearch = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .trim();

export const isMacPlatform = () =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** "⌘K" on Apple devices, "Ctrl K" elsewhere. */
export const commandPaletteShortcutLabel = () =>
  isMacPlatform() ? "⌘K" : "Ctrl K";
