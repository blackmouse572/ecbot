/** The last path segment of a URL, decoded, e.g. "menu.pdf". */
export function fileNameFromUrl(url: string): string {
  const path = url.split(/[?#]/)[0];
  const segment = path.split("/").filter(Boolean).pop() ?? url;
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
